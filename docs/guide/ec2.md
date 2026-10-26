# Ec2

`Ec2` provisions an EC2 instance inside a VPC with SSM Session Manager access, an IAM role, and a security group with outbound HTTP/HTTPS. It is a good base for long-running workloads (ML inference, build agents, game servers) that need to be reachable from other constructs in the same stack.

## What gets deployed

- **EC2 instance** — placed in private subnets, IMDSv2 enforced, no public IP
- **IAM role** — `AmazonSSMManagedInstanceCore` attached; additional policies via `additionalPolicies`
- **Security group** — outbound HTTP (80) and HTTPS (443) open by default; all other traffic must be added explicitly
- **EFS filesystem** *(optional)* — created and mounted at `efsMountPoint` if provided
- **Route53 A record** *(optional)* — registers a private DNS name when `hostname` is provided

## Usage

```ts
import { Ec2 } from 'genesis-cdk';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

const server = new Ec2(this, 'server', {
  vpc,
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
  startupCommands: ['echo "hello" >> /tmp/boot.log'],
});
```

### GPU / Deep Learning AMI

Pass `amiSsmPath` to resolve the instance AMI from an SSM parameter instead of the default Amazon Linux 2023 lookup:

```ts
const gpuInstance = new Ec2(this, 'gpu', {
  vpc,
  subnets: vpc.privateSubnets,
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.G5, ec2.InstanceSize.XLARGE),
  amiSsmPath: '/aws/service/deeplearning/ami/x86_64/base-oss-nvidia-driver-gpu-ubuntu-22.04/latest/ami-id',
  blockDevices: [{
    deviceName: '/dev/sda1',
    volume: ec2.BlockDeviceVolume.ebs(150, { encrypted: true }),
  }],
  instanceInitiatedShutdownBehavior: ec2.InstanceInitiatedShutdownBehavior.STOP,
});
```

### Wiring to a Backend Lambda

```ts
gpuInstance.allowInferenceFrom(backend);              // SG: Lambda → EC2 port 8000
gpuInstance.allowStartStop(backend.lambdaFn.role);    // IAM: Lambda can start/stop this instance
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `vpc` | `ec2.IVpc` | ✓ | VPC to place the instance in |
| `subnets` | `ec2.ISubnet[]` | | Specific subnets; defaults to `vpc.privateSubnets` |
| `instanceType` | `ec2.InstanceType` | | Instance type; defaults to `t3.micro` |
| `blockDevices` | `ec2.BlockDevice[]` | | EBS volumes to attach |
| `efsMountPoint` | `string` | | Creates an EFS filesystem and mounts it at this path |
| `startupCommands` | `string[]` | | Shell commands run on every boot via `/etc/rc.local` |
| `instanceInitiatedShutdownBehavior` | `ec2.InstanceInitiatedShutdownBehavior` | | What happens when the OS shuts down (default: terminate) |
| `hostname` | `HostnameProps` | | Registers a Route53 A record and sets the OS hostname |
| `amiOwner` | `string` | | AMI owner account ID; defaults to Amazon (`137112412989`) |
| `amiSsmPath` | `string` | | SSM parameter path for the AMI ID; takes precedence over `amiOwner` |
| `additionalPolicies` | `iam.PolicyStatement[]` | | Extra IAM policy statements attached to the instance role |

## Accessors

| Accessor | Type | Description |
|---|---|---|
| `instance` | `ec2.Instance` | The underlying CDK instance resource |
| `instanceId` | `string` | The EC2 instance ID (CloudFormation token) |
| `securityGroup` | `ec2.SecurityGroup` | The instance security group |
| `dnsName` | `string` | Private DNS name, or the Route53 record name when `hostname` is set |

## Methods

### `allowStartStop(role)`

Grants an IAM role permission to start and stop this specific instance, plus `DescribeInstances` / `DescribeInstanceStatus` (which AWS requires to be wildcard-scoped).

```ts
gpuInstance.allowStartStop(backend.lambdaFn.role);
```

### `allowInferenceFrom(backend, port?)`

Wires security group rules so the given `Backend`'s Lambda can reach a port on this instance (default `8000`). Adds an ingress rule to the EC2 SG and a matching egress rule to the Lambda SG.

```ts
gpuInstance.allowInferenceFrom(backend);       // port 8000
gpuInstance.allowInferenceFrom(backend, 9000); // custom port
```

### `allowIngressFrom(peer, port, description?)`

Low-level helper to add an ingress rule to the instance security group.

### `allowEgressTo(peer, port, description?)`

Low-level helper to add an egress rule to the instance security group.
