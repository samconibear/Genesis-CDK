import {
  aws_route53,
  aws_certificatemanager,
  aws_ssm,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CertStackProps extends StackProps {
  domain: string;
  accountId: string;
}

export const ssmParamName = {
  certArn: (domain: string) => `/${domain}/certArn`,
  hostedZoneId: (domain: string) => `/${domain}/hostedZoneId`,
  hostedZoneName: (domain: string) => `/${domain}/hostedZoneName`,
  rootDomain: '/genesis-cdk/rootDomain',
};

export class CertStack extends Stack {
  constructor(scope: Construct, id: string, props: CertStackProps) {
    super(scope, id, {
      ...props,
      env: { account: props.accountId, region: 'us-east-1' },
    });

    const hostedZone = new aws_route53.HostedZone(this, 'hosted_zone', {
      zoneName: props.domain,
    });

    const certificate = new aws_certificatemanager.Certificate(this, 'certificate', {
      domainName: props.domain,
      subjectAlternativeNames: [`*.${props.domain}`],
      validation: aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    new aws_ssm.StringParameter(this, 'cert_arn_param', {
      parameterName: ssmParamName.certArn(props.domain),
      stringValue: certificate.certificateArn,
      description: `ACM certificate ARN for ${props.domain}`,
    });

    new aws_ssm.StringParameter(this, 'hosted_zone_id_param', {
      parameterName: ssmParamName.hostedZoneId(props.domain),
      stringValue: hostedZone.hostedZoneId,
      description: `Route53 hosted zone ID for ${props.domain}`,
    });

    new aws_ssm.StringParameter(this, 'hosted_zone_name_param', {
      parameterName: ssmParamName.hostedZoneName(props.domain),
      stringValue: props.domain,
      description: `Route53 hosted zone name for ${props.domain}`,
    });

    new aws_ssm.StringParameter(this, 'root_domain_param', {
      parameterName: ssmParamName.rootDomain,
      stringValue: props.domain,
      description: 'Root domain for genesis-cdk — read by SubSite stacks',
    });
  }
}
