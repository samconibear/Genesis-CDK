import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_apigateway as apigateway,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ApiGatewayAccountStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'apigw_cloudwatch_role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
      ],
    });

    new apigateway.CfnAccount(this, 'apigw_account', {
      cloudWatchRoleArn: role.roleArn,
    });
  }
}
