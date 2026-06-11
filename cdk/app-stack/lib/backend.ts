import * as cdk from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';

interface BackendProps {
  scope: IConstruct;
  id: string;
  domain: string;
  cloudfront: cdk.aws_cloudfront.Distribution;
  hostedZone: cdk.aws_route53.HostedZone;
  certArn: string;
  binaryMediaTypes?: string[];
}

export class Backend {
  apigw_: cdk.aws_apigateway.RestApi;
  apigw(): cdk.aws_apigateway.RestApi { return this.apigw_; }

  api_: cdk.aws_apigateway.Resource;
  api(): cdk.aws_apigateway.Resource { return this.api_; }
  restApiId(): string { return this.apigw_.restApiId; }

  domainName_: string;
  domainName(): string { return this.domainName_; }

  deploymentStageArn_: string;
  deploymentStageArn(): string { return this.apigw_.deploymentStage.stageArn; }

  constructor(props: BackendProps) {
    const { scope, id, } = props;
    const certificate = cdk.aws_certificatemanager.Certificate.fromCertificateArn(
      scope,
      `${id}_certificate`,
      props.certArn
    );


    // // Create log group
    // const logGroup = new LogGroup(scope, `${id}_logGroup`, {
    //   service: 'rest-api-gateway',
    //   app: details.app,
    //   version: "1",
    // });
    const recordName = `api-${props.domain}`;
    // Create API Gateway
    this.apigw_ = new cdk.aws_apigateway.RestApi(scope, `${id}_rest_api`, {
      binaryMediaTypes: (props && props.binaryMediaTypes) ? props.binaryMediaTypes : [],
      domainName: {
        certificate,
        domainName: recordName,
        basePath: 'gw_stage',
        endpointType: cdk.aws_apigateway.EndpointType.REGIONAL,
        securityPolicy: cdk.aws_apigateway.SecurityPolicy.TLS_1_2
      },
      endpointConfiguration: {
        types: [ cdk.aws_apigateway.EndpointType.REGIONAL ]
      },
      disableExecuteApiEndpoint: true,
      restApiName: `${props.domain}_api_gateway`,
      minCompressionSize: cdk.Size.mebibytes(0),
      deploy: true,
      // deployOptions: {
      //   accessLogDestination: new cdk.aws_apigateway.LogGroupLogDestination(logGroup),
      //   accessLogFormat: cdk.aws_apigateway.AccessLogFormat.clf(),
      //   loggingLevel: cdk.aws_apigateway.MethodLoggingLevel.INFO,
      // },
      cloudWatchRole: false,
    });
    
    // Create a new Route 53 A-Record for the API endpoint 
    new cdk.aws_route53.ARecord(scope, `${id}_cloudfront_arecord`, {
      comment: `A Record to API Gateway for ${props.domain}`,
      zone: props.hostedZone,
      target: cdk.aws_route53.RecordTarget.fromAlias(
        new cdk.aws_route53_targets.ApiGateway(this.apigw_)
      ),
      recordName,
    });

    this.api_ = this.apigw_.root.addResource('api');

    const origin = new cdk.aws_cloudfront_origins.HttpOrigin(props.domain, {
      originId: 'apigw_as_http',
      originPath: '/gw_stage',
      originSslProtocols: [ cdk.aws_cloudfront.OriginSslPolicy.TLS_V1_2 ],
      protocolPolicy: cdk.aws_cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });
    props.cloudfront.addBehavior(
      '/api/*',
      origin, 
      {
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
        compress: false,
        viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    );
  }
}