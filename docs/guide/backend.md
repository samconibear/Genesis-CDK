# Backend

`Backend` attaches a Lambda-backed API Gateway to an existing CloudFront distribution. All traffic to `/api/*` is routed through a regional API Gateway endpoint, protected by a Lambda authorizer that verifies a shared secret injected as a custom CloudFront header — so the API Gateway endpoint cannot be called directly.

## What gets deployed

- **API Gateway** — regional REST API on `{domain}.{rootDomain}` (e.g. `api.example.com`), with TLS 1.2 and access logging
- **Lambda function** — your application code, running inside a VPC with no outbound access by default
- **Origin authorizer** — an inline Lambda that rejects requests missing the `x-origin-verify` header
- **Secrets Manager secret** — the shared header value; ARN stored in SSM at `/{rootDomain}/{domain}/originSecretArn`
- **Route53 A record** — points `{domain}.{rootDomain}` at the API Gateway
- **CloudFront behavior** — `/api/*` forwarded to the API Gateway origin with the secret header attached

## Usage

```ts
import { RootSite, Backend } from 'genesis-cdk';

const site = new RootSite({ scope: this, domain: 'example.com', src: './dist' });

const backend = new Backend({
  scope: this,
  domain: 'api',                       // → api.example.com
  cloudfront: site.cloudfrontDist,
  vpc: myVpc,
  codePath: './dist-lambda',
  handler: 'index.handler',
  runtime: lambda.Runtime.NODEJS_22_X,
});
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `scope` | `Stack` | ✓ | The CDK stack this construct belongs to |
| `domain` | `string` | ✓ | Subdomain label, e.g. `'api'` → `api.example.com` |
| `cloudfront` | `cloudfront.Distribution` | ✓ | Distribution to attach the `/api/*` behavior to |
| `vpc` | `ec2.IVpc` | ✓ | VPC the Lambda runs inside |
| `codePath` | `string` | ✓ | Path to the Lambda asset directory |
| `handler` | `string` | ✓ | Lambda handler, e.g. `'index.handler'` |
| `runtime` | `lambda.Runtime` | ✓ | Lambda runtime |
| `vpcSubnets` | `ec2.SubnetSelection` | | Subnet selection for the Lambda (defaults to no subnets) |
| `environment` | `{ [key: string]: string }` | | Lambda environment variables |
| `memorySize` | `number` | | Lambda memory in MB (default: `128`) |
| `timeout` | `Duration` | | Lambda timeout (default: `30s`) |
| `binaryMediaTypes` | `string[]` | | Binary media types for API Gateway (default: `[]`) |

## Accessors

| Accessor | Type | Description |
|---|---|---|
| `lambdaFn` | `lambda.Function` | The backend Lambda function |
| `apigw` | `apigateway.RestApi` | The REST API |
| `api` | `apigateway.Resource` | The `/api` resource — add routes here |
| `securityGroup` | `ec2.SecurityGroup` | The Lambda's security group |

## Adding routes

```ts
backend.api.addResource('users').addMethod('GET',
  new apigateway.LambdaIntegration(backend.lambdaFn, { proxy: true })
);
```

## Allowing outbound internet access

By default the Lambda security group has no egress rules. Call `addEgressInternet()` to open HTTP/HTTPS:

```ts
backend.addEgressInternet();
```
