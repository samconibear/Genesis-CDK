import { Stack, aws_route53, aws_certificatemanager } from 'aws-cdk-lib';
import { BaseSite, BaseSiteProps } from './base-site.js';
import { ssmParamName, ssmLookup } from './cert-stack.js';

export interface RootSiteProps {
  scope: Stack;
  domain: string;
  src: string;
  id?: string;
  bucketNameParameterName?: string;
}

export class RootSite extends BaseSite {
  constructor(props: RootSiteProps) {
    const hostedZoneId = ssmLookup(props.scope, ssmParamName.hostedZoneId(props.domain));
    const certArnRaw = ssmLookup(props.scope, ssmParamName.certArn(props.domain));
    // valueFromLookup returns a dummy string on the first synth pass (before SSM is populated).
    // CloudFront validates ARN format at synth time, so we substitute a well-formed placeholder.
    const certArn = certArnRaw.startsWith('dummy-value-for-')
      ? 'arn:aws:acm:us-east-1:123456789012:certificate/dummy'
      : certArnRaw;

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
