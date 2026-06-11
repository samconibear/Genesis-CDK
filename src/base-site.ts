import {
  aws_s3 as s3,
  aws_s3_deployment as s3_deployment,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfront_origins,
  aws_iam as iam,
  aws_ssm as ssm,
  aws_route53 as route53,
  aws_route53_targets as route53_targets,
  aws_certificatemanager as certificatemanager,
  Stack,
  RemovalPolicy,
  Size,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SubSiteProps } from './sub-site.js';
import { randomUUID } from 'crypto';

export interface BaseSiteProps {
  scope: Stack;
  domains: string[];
  src: string;
  id?: string;
  hostedZone: route53.IHostedZone;
  cloudfrontCertificate: certificatemanager.ICertificate;
  bucketNameParameterName?: string;
}

export class BaseSite extends Construct {
  private _domains: string[];
  private _scope: Stack;
  private _hostedZone: route53.IHostedZone;
  private _cloudfrontCertificate: certificatemanager.ICertificate;
  private _bucket: s3.Bucket;
  get bucket(): s3.Bucket { return this._bucket; }
  get bucketArn(): string { return this._bucket.bucketArn; }

  _cloudfrontDist: cloudfront.Distribution;
  get cloudfrontDist(): cloudfront.Distribution { return this._cloudfrontDist; }
  get cloudfrontArn(): string { return this._cloudfrontDist.distributionArn; }

  constructor({ scope, id = randomUUID(), ...props }: BaseSiteProps) {
    super(scope, id);
    this._scope = scope;
    this._hostedZone = props.hostedZone;
    this._cloudfrontCertificate = props.cloudfrontCertificate;
    this._domains = props.domains;
    const fullDomain = props.domains.join('.');
    const subDomain = props.domains.slice(0, -1).join('.');

    this._bucket = new s3.Bucket(this, 'site_bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    this.addTLSPolicyToS3Bucket();

    new s3_deployment.BucketDeployment(this, 'deploy_website', {
      sources: [s3_deployment.Source.asset(props.src)],
      destinationBucket: this._bucket,
      memoryLimit: 256,
      ephemeralStorageSize: Size.gibibytes(1),
    });

    this._cloudfrontDist = new cloudfront.Distribution(this, 'cloudfront_dist', {
      comment: `${Stack.of(this).stackName} | ${fullDomain}`,
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(this._bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [fullDomain],
      certificate: this._cloudfrontCertificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
      sslSupportMethod: cloudfront.SSLMethod.SNI,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultRootObject: 'index.html',
    });

    new route53.ARecord(this, 'cloudfront_arecord', {
      comment: `A Record to CloudFront for ${fullDomain}`,
      zone: this._hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.CloudFrontTarget(this._cloudfrontDist)
      ),
      recordName: subDomain,
    });

    if (props.bucketNameParameterName) {
      this.storeBucketNameInSSM(props.bucketNameParameterName);
    }
  }

  subSite(props: SubSiteProps): BaseSite {
    return new BaseSite({
      ...props,
      domains: [props.domain, ...this._domains],
      scope: this._scope,
      hostedZone: this._hostedZone,
      cloudfrontCertificate: this._cloudfrontCertificate,
    });
  }

  private addTLSPolicyToS3Bucket() {
    [
      { NumericLessThan: { 's3:TlsVersion': ['1.2'] } },
      { Bool: { 'aws:SecureTransport': ['false'] } },
    ].forEach(conditions => {
      this._bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          principals: [new iam.AnyPrincipal()],
          effect: iam.Effect.DENY,
          actions: ['*'],
          resources: [
            this._bucket.bucketArn,
            this._bucket.arnForObjects('*'),
          ],
          conditions,
        })
      );
    });
  }

  private storeBucketNameInSSM(parameterName: string): void {
    new ssm.StringParameter(this, 'ssm_parameter', {
      parameterName,
      stringValue: this._bucket.bucketName,
      description: `S3 bucket for site: ${this._domains.join('.')}`,
    });
  }
}
