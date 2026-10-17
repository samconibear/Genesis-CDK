# CertStack

`CertStack` is a CloudFormation stack (not a construct) deployed **once per root domain** to `us-east-1`. It provisions everything the other constructs need at synth time: a Route53 hosted zone, a wildcard ACM certificate, and SSM parameters that `RootSite`, `SubSite`, and `Backend` read during `cdk synth`.

## What gets deployed

- **Route53 Hosted Zone** — authoritative DNS for the root domain
- **ACM Wildcard Certificate** — covers `example.com` and `*.example.com`, validated via DNS
- **SSM Parameters** (all in `us-east-1`):
  - `/{domain}/certArn` — certificate ARN
  - `/{domain}/hostedZoneId` — hosted zone ID
  - `/{domain}/hostedZoneName` — hosted zone name
  - `/genesis-cdk/rootDomain` — root domain string, read by `SubSite` and `Backend`

## Usage

```ts
// bin/cert.ts
import { App } from 'aws-cdk-lib';
import { CertStack } from 'genesis-cdk';

const app = new App();

new CertStack(app, 'example-com-cert', {
  domain: 'example.com',
  accountId: '123456789012',
});
```

Deploy with:

```bash
npx cdk deploy --all --app "npx ts-node --esm bin/cert.ts"
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `domain` | `string` | ✓ | Root domain, e.g. `'example.com'` |
| `accountId` | `string` | ✓ | AWS account ID — forces the stack to `us-east-1` in this account |

`CertStack` also accepts all standard CDK `StackProps`.

## After deploying

Point your domain's nameservers at Route53 before deploying any site stacks. Find the NS records in the AWS console under Route53 → Hosted Zones → your domain, then update them at your registrar.

## Utility exports

`cert-stack.ts` also exports two helpers used internally by other constructs:

```ts
ssmParamName.certArn(domain)        // → '/{domain}/certArn'
ssmParamName.hostedZoneId(domain)   // → '/{domain}/hostedZoneId'
ssmParamName.hostedZoneName(domain) // → '/{domain}/hostedZoneName'
ssmParamName.rootDomain             // → '/genesis-cdk/rootDomain'

ssmLookup(scope, paramName)         // reads an SSM parameter at synth time
```
