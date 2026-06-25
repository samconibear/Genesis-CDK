import { Stack, aws_route53, aws_certificatemanager, aws_ssm } from 'aws-cdk-lib';
import { BaseSite } from './base-site.js';
import { ssmParamName } from './cert-stack.js';

export interface SubSiteProps {
  scope: Stack;
  /** The subdomain label, e.g. 'blog' for blog.example.com */
  domain: string;
  src: string;
  bucketNameParameterName?: string;
}

export class SubSite extends BaseSite {
  constructor(props: SubSiteProps) {
    const rootDomain = aws_ssm.StringParameter.valueFromLookup(
      props.scope,
      ssmParamName.rootDomain
    );

    const hostedZoneId = aws_ssm.StringParameter.valueFromLookup(
      props.scope,
      ssmParamName.hostedZoneId(rootDomain)
    );

    const hostedZoneName = aws_ssm.StringParameter.valueFromLookup(
      props.scope,
      ssmParamName.hostedZoneName(rootDomain)
    );

    const certArn = aws_ssm.StringParameter.valueFromLookup(
      props.scope,
      ssmParamName.certArn(rootDomain)
    );

    const hostedZone = aws_route53.HostedZone.fromHostedZoneAttributes(
      props.scope,
      'hosted_zone',
      { hostedZoneId, zoneName: hostedZoneName }
    );

    const cloudfrontCertificate = aws_certificatemanager.Certificate.fromCertificateArn(
      props.scope,
      'cloudfront_certificate',
      certArn
    );

    super({
      scope: props.scope,
      src: props.src,
      domains: [props.domain, rootDomain],
      hostedZone,
      cloudfrontCertificate,
      bucketNameParameterName: props.bucketNameParameterName,
    });
  }
}
