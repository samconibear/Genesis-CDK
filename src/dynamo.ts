import {
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  RemovalPolicy,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface DynamoProps {
  /** DynamoDB table name */
  readonly tableName: string;
  /** Partition key attribute name */
  readonly partitionKey: string;
  /** Attribute name to use for TTL; omit to disable TTL */
  readonly ttlAttribute?: string;
}

export class Dynamo extends Construct {
  private _table: dynamodb.Table;
  get table(): dynamodb.Table { return this._table; }
  get tableName(): string { return this._table.tableName; }

  constructor(scope: Construct, id: string, props: DynamoProps) {
    super(scope, id);

    this._table = new dynamodb.Table(this, 'table', {
      tableName: props.tableName,
      partitionKey: { name: props.partitionKey, type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      ...(props.ttlAttribute && { timeToLiveAttribute: props.ttlAttribute }),
    });
  }

  grantReadWrite(grantee: iam.IGrantable): void {
    this._table.grantReadWriteData(grantee);
  }
}
