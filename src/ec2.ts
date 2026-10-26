import {
  aws_ec2 as ec2,
  aws_efs as efs,
  aws_iam as iam,
  aws_route53 as route53,
  RemovalPolicy,
  Stack,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Backend } from './backend.ts';

export interface HostnameProps {
  /** Short name used as the DNS record, e.g. 'myserver' */
  readonly name: string;
  /** Hosted zone to register the A record in */
  readonly hostedZone: route53.IHostedZone;
}

export interface Ec2Props {
  readonly vpc: ec2.IVpc;
  /** Specific subnets to place the instance in; defaults to vpc.privateSubnets */
  readonly subnets?: ec2.ISubnet[];
  readonly instanceType?: ec2.InstanceType;
  readonly blockDevices?: ec2.BlockDevice[];
  /** If set, creates an EFS filesystem and mounts it at this path */
  readonly efsMountPoint?: string;
  /** Additional user-data commands to run on first boot */
  readonly startupCommands?: string[];
  readonly instanceInitiatedShutdownBehavior?: ec2.InstanceInitiatedShutdownBehavior;
  /** If set, registers a Route53 A record using this hostname config */
  readonly hostname?: HostnameProps;
  /** AMI owner account ID; defaults to Amazon (137112412989) */
  readonly amiOwner?: string;
  /**
   * Full SSM parameter path for the AMI ID.
   * e.g. /aws/service/deeplearning/ami/x86_64/base-oss-nvidia-driver-gpu-ubuntu-22.04/latest/ami-id
   * If provided, takes precedence over amiOwner.
   */
  readonly amiSsmPath?: string;
  /** IAM policy statements to attach to the instance role */
  readonly additionalPolicies?: iam.PolicyStatement[];
}

export class Ec2 extends Construct {
  private _instance: ec2.Instance;
  get instance(): ec2.Instance { return this._instance; }
  get instanceId(): string { return this._instance.instanceId; }

  private _securityGroup: ec2.SecurityGroup;
  get securityGroup(): ec2.SecurityGroup { return this._securityGroup; }

  /** The DNS name for this instance — a Route53 record name if hostname was set, otherwise the private DNS name */
  private _dnsName: string;
  get dnsName(): string { return this._dnsName; }

  constructor(scope: Construct, id: string, props: Ec2Props) {
    super(scope, id);

    const { vpc } = props;
    const subnets = props.subnets ?? vpc.privateSubnets;

    const role = new iam.Role(this, 'role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    this._securityGroup = new ec2.SecurityGroup(this, 'sg', {
      vpc,
      allowAllOutbound: false,
      disableInlineRules: true,
    });

    this._securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'outbound http');
    this._securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'outbound https');

    const machineImage = this.resolveAmi(props.amiSsmPath, props.amiOwner);
    const instanceType = props.instanceType
      ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

    this._instance = new ec2.Instance(this, 'instance', {
      vpc,
      instanceType,
      machineImage,
      associatePublicIpAddress: false,
      requireImdsv2: true,
      role,
      securityGroup: this._securityGroup,
      ssmSessionPermissions: true,
      vpcSubnets: { subnets },
      blockDevices: props.blockDevices,
      userDataCausesReplacement: true,
      instanceInitiatedShutdownBehavior: props.instanceInitiatedShutdownBehavior,
    });

    if (props.additionalPolicies) {
      for (const statement of props.additionalPolicies) {
        role.addToPrincipalPolicy(statement);
      }
    }

    this.addBootstrapUserData();

    if (props.hostname) {
      this._instance.addUserData(
        `hostnamectl set-hostname ${props.hostname.name}.${props.hostname.hostedZone.zoneName}`
      );
    }

    if (props.startupCommands && props.startupCommands.length > 0) {
      this.configureRcLocal(props.startupCommands);
    }

    if (props.efsMountPoint) {
      this.attachEfs(vpc, subnets, props.efsMountPoint);
    }

    this._dnsName = this._instance.instancePrivateDnsName;
    if (props.hostname) {
      const { name, hostedZone } = props.hostname;
      this._dnsName = `${name}.${hostedZone.zoneName}`;
      new route53.ARecord(this, 'a_record', {
        zone: hostedZone,
        recordName: name,
        target: route53.RecordTarget.fromIpAddresses(this._instance.instancePrivateIp),
      });
    }
  }

  /** Allow additional inbound access to the instance security group */
  allowIngressFrom(peer: ec2.IPeer, port: ec2.Port, description?: string): void {
    this._securityGroup.addIngressRule(peer, port, description ?? '');
  }

  /** Allow additional outbound access from the instance security group */
  allowEgressTo(peer: ec2.IPeer, port: ec2.Port, description?: string): void {
    this._securityGroup.addEgressRule(peer, port, description ?? '');
  }

  /** Grant an IAM role permission to start, stop, and describe this instance */
  allowStartStop(role: iam.IRole): void {
    role.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ec2:StartInstances', 'ec2:StopInstances'],
      resources: [
        Stack.of(this).formatArn({
          service: 'ec2',
          resource: 'instance',
          resourceName: this._instance.instanceId,
        }),
      ],
    }));
    // DescribeInstances/DescribeInstanceStatus do not support resource-level restrictions
    role.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ec2:DescribeInstances', 'ec2:DescribeInstanceStatus'],
      resources: ['*'],
    }));
  }

  /** Wire SG rules so the given Backend's Lambda can reach the vLLM port on this instance */
  allowInferenceFrom(backend: Backend, port = 8000): void {
    this._securityGroup.addIngressRule(
      ec2.Peer.securityGroupId(backend.securityGroup.securityGroupId),
      ec2.Port.tcp(port),
      'vLLM inference from Lambda',
    );
    backend.securityGroup.addEgressRule(
      ec2.Peer.securityGroupId(this._securityGroup.securityGroupId),
      ec2.Port.tcp(port),
      'vLLM inference to EC2',
    );
  }

  private resolveAmi(amiSsmPath?: string, amiOwner?: string): ec2.IMachineImage {
    if (amiSsmPath) {
      return ec2.MachineImage.fromSsmParameter(amiSsmPath);
    }
    return ec2.MachineImage.lookup({
      name: 'al2023-ami-*-kernel-*-x86_64',
      owners: [amiOwner ?? '137112412989'],
    });
  }

  private addBootstrapUserData(): void {
    // Wait for rpm lock before running dnf — cloud-init races with package manager on AL2023
    this._instance.addUserData(`
timeout=0
while [ -f /var/lib/rpm/.rpm.lock ]; do
  [ "$timeout" -eq 120 ] && break
  sleep 1
  ((timeout++))
done
sudo dnf update -y
sudo dnf install -y jq amazon-efs-utils
    `.trim());
  }

  private configureRcLocal(commands: string[]): void {
    this._instance.addUserData(`
cat > /etc/systemd/system/rc-local.service << 'EOF'
[Unit]
Description=/etc/rc.local Compatibility
ConditionPathExists=/etc/rc.local

[Service]
Type=forking
ExecStart=/etc/rc.local start
TimeoutSec=0
StandardOutput=tty
RemainAfterExit=yes
SysVStartPriority=99

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/rc.local << 'EOF'
#!/bin/bash
${commands.join('\n')}
exit 0
EOF
chmod +x /etc/rc.local
systemctl enable rc-local
systemctl start rc-local
    `.trim());
  }

  private attachEfs(vpc: ec2.IVpc, subnets: ec2.ISubnet[], mountPoint: string): void {
    const efsSg = new ec2.SecurityGroup(this, 'efs_sg', {
      vpc,
      allowAllOutbound: false,
      disableInlineRules: true,
    });

    this._securityGroup.addEgressRule(
      ec2.Peer.securityGroupId(efsSg.securityGroupId),
      ec2.Port.tcp(2049),
      'to EFS',
    );
    efsSg.addIngressRule(
      ec2.Peer.securityGroupId(this._securityGroup.securityGroupId),
      ec2.Port.tcp(2049),
      'from EC2',
    );

    const fileSystem = new efs.FileSystem(this, 'efs', {
      vpc,
      encrypted: true,
      removalPolicy: RemovalPolicy.DESTROY,
      securityGroup: efsSg,
      vpcSubnets: { subnets },
    });

    this._instance.addUserData(`
sudo mkdir -p ${mountPoint}
sudo mount -t efs ${fileSystem.fileSystemId}:/ ${mountPoint}
echo "${fileSystem.fileSystemId}:/ ${mountPoint} efs defaults,_netdev 0 0" >> /etc/fstab
    `.trim());
  }
}
