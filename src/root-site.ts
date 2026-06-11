import { Stack, aws_route53, aws_certificatemanager, aws_ssm } from 'aws-cdk-lib';
import { BaseSite, BaseSiteProps } from './base-site.js';
import { ssmParamName } from './cert-stack.js';

export interface RootSiteProps {
  scope: Stack;
  domain: string;
  src: string;
  id?: string;
  bucketNameParameterName?: string;
}

export class RootSite extends BaseSite {
  constructor(props: RootSiteProps) {
    const hostedZoneId = aws_ssm.StringParameter.valueFromLookup(
      props.scope,
      ssmParamName.hostedZoneId(props.domain)
    );

    const certArn = aws_ssm.StringParameter.valueFromLookup(
      props.scope,
      ssmParamName.certArn(props.domain)
    );

    const hostedZone = aws_route53.HostedZone.fromHostedZoneAttributes(
      props.scope,
      'hosted_zone',
      { hostedZoneId, zoneName: props.domain }
    );

    const cloudfrontCertificate = aws_certificatemanager.Certificate.fromCertificateArn(
      props.scope,
      'cloudfront_certificate',
      certArn
    );

    super({
      ...props,
      hostedZone,
      cloudfrontCertificate,
      domains: [props.domain],
    });
  }
}
