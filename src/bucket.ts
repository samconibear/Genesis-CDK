import {
  aws_s3 as s3,
  aws_iam as iam,
  Duration,
  RemovalPolicy,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface BucketProps {
  /** Number of days before objects are automatically deleted; omit to disable expiry */
  readonly expirationDays?: number;
}

export class Bucket extends Construct {
  private _bucket: s3.Bucket;
  get bucket(): s3.Bucket { return this._bucket; }
  get bucketName(): string { return this._bucket.bucketName; }

  constructor(scope: Construct, id: string, props: BucketProps = {}) {
    super(scope, id);

    this._bucket = new s3.Bucket(this, 'bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      ...(props.expirationDays && {
        lifecycleRules: [{ expiration: Duration.days(props.expirationDays) }],
      }),
    });
  }

  grantReadWrite(grantee: iam.IGrantable): void {
    this._bucket.grantReadWrite(grantee);
  }
}
