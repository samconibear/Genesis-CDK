# RootSite

`RootSite` deploys a static site at a root domain (e.g. `example.com`). It reads the hosted zone and ACM certificate from SSM — both written by `CertStack` — and creates an S3 bucket, CloudFront distribution, and Route53 A record.

## Prerequisites

`CertStack` must be deployed first. It provisions the hosted zone and wildcard certificate that `RootSite` reads at synth time.

## Usage

```ts
import { Stack } from 'aws-cdk-lib';
import { RootSite } from 'genesis-cdk';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new RootSite({
      scope: this,
      domain: 'example.com',
      src: './dist',
    });
  }
}
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `scope` | `Stack` | ✓ | The CDK stack this construct belongs to |
| `domain` | `string` | ✓ | Root domain, e.g. `'example.com'` |
| `src` | `string` | ✓ | Path to the built site asset directory |
| `id` | `string` | | Construct ID (defaults to domain with dots replaced by hyphens) |
| `bucketNameParameterName` | `string` | | SSM parameter name to store the S3 bucket name in |

## Accessors

| Accessor | Type | Description |
|---|---|---|
| `bucket` | `s3.Bucket` | The S3 bucket |
| `bucketArn` | `string` | ARN of the S3 bucket |
| `cloudfrontDist` | `cloudfront.Distribution` | The CloudFront distribution |
| `cloudfrontArn` | `string` | ARN of the CloudFront distribution |

## Adding a backend

Pass `cloudfrontDist` to `Backend` to attach an API Gateway origin on `/api/*`:

```ts
const site = new RootSite({ scope: this, domain: 'example.com', src: './dist' });

const backend = new Backend({
  scope: this,
  domain: 'api',
  cloudfront: site.cloudfrontDist,
  // ...
});
```

## Adding sub-sites

Call `subSite()` on an existing `RootSite` (or any `BaseSite`) to attach a subdomain that shares the same hosted zone and certificate:

```ts
const site = new RootSite({ scope: this, domain: 'example.com', src: './dist' });

site.subSite({ scope: this, domain: 'blog', src: './blog/dist' });
// → blog.example.com
```
