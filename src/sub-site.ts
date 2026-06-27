import { Stack, aws_route53, aws_certificatemanager } from 'aws-cdk-lib';
import { BaseSite } from './base-site.js';
import { ssmParamName, ssmLookup } from './cert-stack.js';

export interface SubSiteProps {
  scope: Stack;
  /** The subdomain label, e.g. 'blog' for blog.example.com */
  domain: string;
  src: string;
  bucketNameParameterName?: string;
}

export class SubSite extends BaseSite {
  constructor(props: SubSiteProps) {
    const rootDomain = ssmLookup(props.scope, ssmParamName.rootDomain);
    const hostedZoneId = ssmLookup(props.scope, ssmParamName.hostedZoneId(rootDomain));
    const hostedZoneName = ssmLookup(props.scope, ssmParamName.hostedZoneName(rootDomain));
    const certArnRaw = ssmLookup(props.scope, ssmParamName.certArn(rootDomain));

    // ContextProvider returns a dummy string on the first synth pass.
    // CloudFront validates ARN format at synth time, so substitute a well-formed placeholder.
    const certArn = certArnRaw.startsWith('dummy-value-for-')
      ? 'arn:aws:acm:us-east-1:123456789012:certificate/dummy'
      : certArnRaw;

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
