import { Stack, aws_route53, aws_certificatemanager } from 'aws-cdk-lib';
import { BaseSite } from './base-site';

function fromContext(scope: Stack, name: string): string {
  const contextVar = scope.node.tryGetContext(name);
  if (!contextVar) {
    throw new Error(`${name} context value is required`);
  }
  return contextVar
}

export interface RootSiteProps {
  scope: Stack;
  src: string;
  id?: string;
  // connectSrc: string[],
  // frameSrc: string[],
  bucketNameParameterName?: string;
}
export class RootSite extends BaseSite {
  constructor(props: RootSiteProps) {
    // const zoneName = fromContext(props.scope, 'rootDomain');
    const zoneName = 'sconi.io';
    // const hostedZoneId = fromContext(props.scope, 'zoneId');
    const hostedZoneId = 'Z0367863FTQN44N92WNV';
    const hostedZone = aws_route53.HostedZone.fromHostedZoneAttributes(
      props.scope,
      'hosted_zone',
      {
        hostedZoneId,
        zoneName
      });

    // const certificateArn = fromContext(props.scope, 'certArn');
    const certificateArn = 'arn:aws:acm:us-east-1:959067479367:certificate/30d2f058-f625-4af4-84d1-981c9f905484';
    const cloudfrontCertificate = aws_certificatemanager.Certificate.fromCertificateArn(
      props.scope,
      'cloudfrontCertificate',
      certificateArn
    );

    const id = crypto.randomUUID();

    super({
      ...props,
      id,
      hostedZone,
      cloudfrontCertificate,
      domains: [ zoneName ]
    });
  }
}