import {
  aws_route53,
  aws_certificatemanager,
  Stack,
  StackProps,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

const ZONE_NAME = 'sconi.io';

export class CertStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const hostedZone = new aws_route53.HostedZone(this, 'hosted_zone', {
      zoneName: ZONE_NAME,
    });
    const cloudfrontCertificate = new aws_certificatemanager.Certificate(
      this,
      'acm_cert',
      {
        domainName: ZONE_NAME,
        subjectAlternativeNames: [ `*.${ZONE_NAME}` ],
        validation: aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );
    new CfnOutput(this, 'hostedZoneId', {
      value: hostedZone.hostedZoneId,
      exportName: 'zoneId',
    });
    new CfnOutput(this, 'certArn', {
      value: cloudfrontCertificate.certificateArn,
      exportName: 'certArn',
    });
    new CfnOutput(this, 'rootDomain', {
      value: ZONE_NAME,
      exportName: 'rootDomain',
    });

    // new aws_ssm.StringParameter(scope, 'acm_cert_arn_param', {
    //   parameterName: `${ZONE_NAME}/certArn`,
    //   stringValue: cloudfrontCertificate.certificateArn,
    // });
    // new aws_ssm.StringParameter(scope, 'hosted_zone_id_param', {
    //   parameterName: `${ZONE_NAME}/zoneId`,
    //   stringValue: hostedZone.hostedZoneId,
    // });
  }
}
