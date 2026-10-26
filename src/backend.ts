import {
  aws_apigateway as apigateway,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfront_origins,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_secretsmanager as secretsmanager,
  aws_ssm as ssm,
  Duration,
  RemovalPolicy,
  Size,
  Stack,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ssmParamName, ssmLookup } from './cert-stack.ts';

export interface BackendProps {
  scope: Stack;
  /** Subdomain label for the API, e.g. 'api' → api.example.com */
  domain: string;
  /** CloudFront distribution to attach the /api/* behavior to */
  cloudfront: cloudfront.Distribution;
  /** VPC the Lambda will run inside; omit to run Lambda outside any VPC */
  vpc?: ec2.IVpc;
  /** Path to the Lambda code asset directory */
  codePath: string;
  /** Lambda handler, e.g. 'index.handler' */
  handler: string;
  /** Lambda runtime */
  runtime: lambda.Runtime;
  vpcSubnets?: ec2.SubnetSelection;
  environment?: { [key: string]: string };
  memorySize?: number;
  timeout?: Duration;
  binaryMediaTypes?: string[];
}

export class Backend extends Construct {
  private _lambda: lambda.Function;
  get lambdaFn(): lambda.Function { return this._lambda; }

  private _apigw: apigateway.RestApi;
  get apigw(): apigateway.RestApi { return this._apigw; }

  private _api: apigateway.Resource;
  get api(): apigateway.Resource { return this._api; }

  private _securityGroup: ec2.SecurityGroup | undefined;
  get securityGroup(): ec2.SecurityGroup {
    if (!this._securityGroup) throw new Error('securityGroup is only available when vpc is provided');
    return this._securityGroup;
  }

  private _lambdaRole!: iam.Role;

  private _props: Omit<BackendProps, 'scope'>;
  private _rootDomain: string;

  constructor({ scope, ...props }: BackendProps) {
    const rootDomain = ssmLookup(scope, ssmParamName.rootDomain);

    super(scope, props.domain);

    this._props = props;
    this._rootDomain = rootDomain;

    const originSecret = this.createOriginSecret();
    this.createLambda();
    const authorizer = this.createAuthorizer(originSecret);
    this.createApiGateway(authorizer);
    this.attachToCloudFront(originSecret);
  }

  private createOriginSecret(): secretsmanager.Secret {
    const { domain } = this._props;
    const rootDomain = this._rootDomain;

    // Secret shared between CloudFront (as a custom header) and the API Gateway authorizer.
    // Direct calls to the execute-api endpoint without this header are rejected by the authorizer.
    const originSecret = new secretsmanager.Secret(this, 'origin_secret', {
      description: `CloudFront origin verification secret for ${domain} API`,
      generateSecretString: { excludePunctuation: true, passwordLength: 32 },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ssm.StringParameter(this, 'origin_secret_arn_param', {
      parameterName: `/${rootDomain}/${domain}/originSecretArn`,
      stringValue: originSecret.secretArn,
      description: `ARN of the CloudFront origin secret for ${domain} API`,
    });

    return originSecret;
  }

  private createLambda(): void {
    const { domain, vpc, vpcSubnets, codePath, handler, runtime, environment, memorySize, timeout } = this._props;

    this._lambdaRole = new iam.Role(this, 'lambda_role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `IAM role for ${domain} backend lambda`,
    });

    const iamActions = [
      'logs:CreateLogGroup',
      'logs:CreateLogStream',
      'logs:PutLogEvents',
    ];

    if (vpc) {
      iamActions.push(
        'ec2:DescribeNetworkInterfaces',
        'ec2:CreateNetworkInterface',
        'ec2:DeleteNetworkInterface',
      );

      this._securityGroup = new ec2.SecurityGroup(this, 'lambda_sg', {
        vpc,
        allowAllOutbound: false,
        description: `Security group for ${domain} backend lambda`,
        disableInlineRules: true,
      });
    }

    this._lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: iamActions,
      resources: ['*'],
    }));

    const lambdaLogGroup = new logs.LogGroup(this, 'lambda_log_group', {
      logGroupName: `/cdk/lambda/${domain}/1`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this._lambda = new lambda.Function(this, 'lambda_function', {
      description: `Backend lambda for ${domain}`,
      ...(vpc && this._securityGroup && {
        vpc,
        allowPublicSubnet: false,
        vpcSubnets: vpcSubnets ?? { subnets: [] },
        securityGroups: [this._securityGroup],
      }),
      role: this._lambdaRole,
      code: lambda.Code.fromAsset(codePath),
      handler,
      runtime,
      environment,
      memorySize: memorySize ?? 128,
      timeout: timeout ?? Duration.seconds(30),
      logGroup: lambdaLogGroup,
    });
  }

  private createAuthorizer(originSecret: secretsmanager.Secret): apigateway.RequestAuthorizer {
    const { domain } = this._props;

    // Lambda authorizer that verifies the x-origin-verify header matches the origin secret.
    const authorizerRole = new iam.Role(this, 'authorizer_role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `IAM role for ${domain} origin authorizer lambda`,
    });

    authorizerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*'],
    }));

    const authorizerLogGroup = new logs.LogGroup(this, 'authorizer_log_group', {
      logGroupName: `/cdk/lambda/${domain}-authorizer/1`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Inline authorizer: the secret value is injected via CloudFormation dynamic reference
    // into the Lambda environment at deploy time. Checks x-origin-verify header.
    const authorizerFn = new lambda.Function(this, 'authorizer_function', {
      description: `Origin verification authorizer for ${domain} API`,
      role: authorizerRole,
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  const expected = process.env.SECRET_VALUE;
  const header = (event.headers || {})['x-origin-verify'] || '';
  const allow = expected && header === expected;
  return {
    principalId: 'cloudfront',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: allow ? 'Allow' : 'Deny',
        Resource: event.methodArn,
      }],
    },
  };
};
      `.trim()),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        SECRET_VALUE: originSecret.secretValue.unsafeUnwrap(),
      },
      timeout: Duration.seconds(5),
      logGroup: authorizerLogGroup,
    });

    return new apigateway.RequestAuthorizer(this, 'origin_authorizer', {
      handler: authorizerFn,
      identitySources: [apigateway.IdentitySource.header('x-origin-verify')],
      // Cache based on the header value; 5 min TTL reduces Secrets Manager calls
      resultsCacheTtl: Duration.minutes(5),
    });
  }

  private createApiGateway(authorizer: apigateway.RequestAuthorizer): void {
    const { domain, binaryMediaTypes } = this._props;

    const apiLogGroup = new logs.LogGroup(this, 'apigw_log_group', {
      logGroupName: `/cdk/rest-api-gateway/${domain}/1`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this._apigw = new apigateway.RestApi(this, 'rest_api', {
      binaryMediaTypes: binaryMediaTypes ?? [],
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      restApiName: `${domain}_api_gateway`,
      minCompressionSize: Size.mebibytes(0),
      deploy: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.clf(),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      cloudWatchRole: false,
    });

    this._api = this._apigw.root.addResource('api');

    const lambdaIntegration = new apigateway.LambdaIntegration(this._lambda, {
      proxy: true,
    });

    // All routes under /api require the origin authorizer
    this._api.addMethod('ANY', lambdaIntegration, { authorizer });
    this._api.addResource('{proxy+}').addMethod('ANY', lambdaIntegration, { authorizer });
  }

  private attachToCloudFront(originSecret: secretsmanager.Secret): void {
    const { domain } = this._props;

    const originHostname = `${this._apigw.restApiId}.execute-api.${Stack.of(this).region}.amazonaws.com`;

    // CloudFront origin — forwards the secret header so the authorizer accepts it
    const cfOrigin = new cloudfront_origins.HttpOrigin(originHostname, {
      originPath: `/${this._apigw.deploymentStage.stageName}`,
      originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      customHeaders: {
        'x-origin-verify': originSecret.secretValue.unsafeUnwrap(),
      },
    });

    this._props.cloudfront.addBehavior('/api/*', cfOrigin, {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      compress: false,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      // ALL_VIEWER_EXCEPT_HOST_HEADER forwards all viewer headers (including Authorization)
      // without CloudFront re-setting Host to the origin hostname.
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    });
  }

  /** Allow the backend Lambda to make outbound HTTP/HTTPS calls; only valid when vpc is provided */
  addEgressInternet(): void {
    this.securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow outbound http');
    this.securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'allow outbound https');
  }

  /** Grant the backend Lambda permission to invoke specific Bedrock models or cross-region inference profiles */
  grantBedrockInvoke(modelIds: string[]): void {
    const region = Stack.of(this).region;
    const account = Stack.of(this).account;
    const actions = [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
      'bedrock:Converse',
      'bedrock:ConverseStream',
    ];
    this._lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: modelIds.map(id => `arn:aws:bedrock:${region}::foundation-model/${id}`),
    }));
    this._lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: modelIds.map(id => `arn:aws:bedrock:${region}:${account}:inference-profile/${id}`),
    }));
  }
}
