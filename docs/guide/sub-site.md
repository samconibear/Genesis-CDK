# SubSite

`SubSite` deploys a static site at a subdomain (e.g. `blog.example.com`). It reads the root domain, hosted zone, and ACM certificate from SSM — all written by `CertStack` — and creates an S3 bucket, CloudFront distribution, and Route53 A record.

Use `SubSite` when a subdomain is deployed from a **separate repo or stack** to the root domain. If both live in the same stack, prefer calling `site.subSite()` on an existing `RootSite` instead.

## Prerequisites

`CertStack` must be deployed first for the root domain.

## Usage

```ts
import { Stack } from 'aws-cdk-lib';
import { SubSite } from 'genesis-cdk';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new SubSite({
      scope: this,
      domain: 'blog',   // → blog.example.com
      src: './dist',
    });
  }
}
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `scope` | `Stack` | ✓ | The CDK stack this construct belongs to |
| `domain` | `string` | ✓ | Subdomain label, e.g. `'blog'` → `blog.example.com` |
| `src` | `string` | ✓ | Path to the built site asset directory |
| `bucketNameParameterName` | `string` | | SSM parameter name to store the S3 bucket name in |

## Accessors

Inherited from `BaseSite`:

| Accessor | Type | Description |
|---|---|---|
| `bucket` | `s3.Bucket` | The S3 bucket |
| `bucketArn` | `string` | ARN of the S3 bucket |
| `cloudfrontDist` | `cloudfront.Distribution` | The CloudFront distribution |
| `cloudfrontArn` | `string` | ARN of the CloudFront distribution |
