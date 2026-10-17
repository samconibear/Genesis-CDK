import {
  aws_apigateway as apigateway,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfront_origins,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_route53 as route53,
  aws_route53_targets as route53_targets,
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
  /** VPC the Lambda will run inside */
  vpc: ec2.IVpc;
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

  private _securityGroup: ec2.SecurityGroup;
  get securityGroup(): ec2.SecurityGroup { return this._securityGroup; }

  private _props: Omit<BackendProps, 'scope'>;
  private _rootDomain: string;

  constructor({ scope, ...props }: BackendProps) {
    const rootDomain = ssmLookup(scope, ssmParamName.rootDomain);
    const hostedZoneId = ssmLookup(scope, ssmParamName.hostedZoneId(rootDomain));
    const hostedZoneName = ssmLookup(scope, ssmParamName.hostedZoneName(rootDomain));
    const certArnRaw = ssmLookup(scope, ssmParamName.certArn(rootDomain));
    const certArn = certArnRaw.startsWith('dummy-value-for-')
      ? 'arn:aws:acm:us-east-1:123456789012:certificate/dummy'
      : certArnRaw;

    super(scope, props.domain);

    this._props = props;
    this._rootDomain = rootDomain;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'hosted_zone', {
      hostedZoneId,
      zoneName: hostedZoneName,
    });

    const certificate = acm.Certificate.fromCertificateArn(this, 'certificate', certArn);

    const { originSecret, recordName } = this.createOriginSecret();
    this.createLambda();
    const authorizer = this.createAuthorizer(originSecret);
    this.createApiGateway(recordName, certificate, hostedZone, authorizer);
    this.attachToCloudFront(recordName, originSecret);
  }

  private createOriginSecret(): { originSecret: secretsmanager.Secret; recordName: string } {
    const { domain } = this._props;
    const rootDomain = this._rootDomain;

    // Secret shared between CloudFront (as a custom header) and the API Gateway authorizer.
    // Direct calls to the custom domain without this header are rejected by the authorizer.
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

    const recordName = `${domain}.${rootDomain}`;

    return { originSecret, recordName };
  }

  private createLambda(): void {
    const { domain, vpc, vpcSubnets, codePath, handler, runtime, environment, memorySize, timeout } = this._props;

    // Security group for the backend Lambda — no outbound by default
    this._securityGroup = new ec2.SecurityGroup(this, 'lambda_sg', {
      vpc,
      allowAllOutbound: false,
      description: `Security group for ${domain} backend lambda`,
      disableInlineRules: true,
    });

    const lambdaRole = new iam.Role(this, 'lambda_role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `IAM role for ${domain} backend lambda`,
    });

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:DescribeNetworkInterfaces',
        'ec2:CreateNetworkInterface',
        'ec2:DeleteNetworkInterface',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    const lambdaLogGroup = new logs.LogGroup(this, 'lambda_log_group', {
      logGroupName: `/cdk/lambda/${domain}/1`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this._lambda = new lambda.Function(this, 'lambda_function', {
      description: `Backend lambda for ${domain}`,
      vpc,
      role: lambdaRole,
      allowPublicSubnet: false,
      vpcSubnets: vpcSubnets ?? { subnets: [] },
      securityGroups: [this._securityGroup],
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

  private createApiGateway(
    recordName: string,
    certificate: acm.ICertificate,
    hostedZone: route53.IHostedZone,
    authorizer: apigateway.RequestAuthorizer,
  ): void {
    const { domain, binaryMediaTypes } = this._props;

    const apiLogGroup = new logs.LogGroup(this, 'apigw_log_group', {
      logGroupName: `/cdk/rest-api-gateway/${domain}/1`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this._apigw = new apigateway.RestApi(this, 'rest_api', {
      binaryMediaTypes: binaryMediaTypes ?? [],
      domainName: {
        certificate,
        domainName: recordName,
        basePath: 'gw_stage',
        endpointType: apigateway.EndpointType.REGIONAL,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      disableExecuteApiEndpoint: true,
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

    new route53.ARecord(this, 'api_arecord', {
      comment: `A Record to API Gateway for ${domain}`,
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.ApiGateway(this._apigw)
      ),
      recordName,
    });

    this._api = this._apigw.root.addResource('api');

    const lambdaIntegration = new apigateway.LambdaIntegration(this._lambda, {
      proxy: true,
    });

    // All routes under /api require the origin authorizer
    this._api.addMethod('ANY', lambdaIntegration, { authorizer });
    this._api.addResource('{proxy+}').addMethod('ANY', lambdaIntegration, { authorizer });
  }

  private attachToCloudFront(recordName: string, originSecret: secretsmanager.Secret): void {
    const { domain } = this._props;

    // CloudFront origin — forwards the secret header so the authorizer accepts it
    const cfOrigin = new cloudfront_origins.HttpOrigin(recordName, {
      originPath: '/gw_stage',
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
      originRequestPolicy: new cloudfront.OriginRequestPolicy(this, 'api_origin_request_policy', {
        comment: `${domain} API origin request policy`,
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          'Content-Type',
          'Authorization',
          'Accept',
        ),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
      }),
    });
  }

  /** Allow the backend Lambda to make outbound HTTP/HTTPS calls */
  addEgressInternet(): void {
    this._securityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow outbound http'
    );
    this._securityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow outbound https'
    );
  }
}
