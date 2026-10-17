# CiRole

`CiRole` creates a GitHub Actions OIDC IAM role that your CI workflows can assume via `aws-actions/configure-aws-credentials`. No long-lived AWS credentials needed — GitHub's OIDC token is exchanged for short-lived credentials at runtime.

`CiRole` is typically created inside `CertStack` and deployed once per domain.

## What gets deployed

- **GitHub OIDC provider** — registers `token.actions.githubusercontent.com` as a trusted identity provider
- **IAM role** — named `genesis-cdk-ci-{domain}`, assumable only by the specified GitHub repos pushing to `main`
- **IAM policies** — scoped permissions for S3, CloudFront, Route53, ACM, SSM, CloudFormation, IAM, and Lambda
- **CloudFormation output** — `CiRoleArn`, the role ARN to add as a GitHub secret

## Usage

```ts
import { CiRole } from 'genesis-cdk';

new CiRole(scope, 'ci_role', {
  domain: 'example.com',
  accountId: '123456789012',
  githubRepos: ['my-org/my-repo', 'my-org/another-repo'],
});
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `domain` | `string` | ✓ | Root domain — used to scope SSM and ACM permissions |
| `accountId` | `string` | ✓ | AWS account ID — used to scope IAM and CloudFormation permissions |
| `githubRepos` | `string[]` | ✓ | GitHub repos in `owner/repo` format that can assume this role (main branch only) |

## Accessors

| Accessor | Type | Description |
|---|---|---|
| `roleArn` | `string` | The IAM role ARN — also exported as a CloudFormation output `CiRoleArn` |

## Retrieving the role ARN after deploy

```bash
aws cloudformation describe-stacks \
  --stack-name example-com-cert \
  --query "Stacks[0].Outputs[?OutputKey=='CiRoleArn'].OutputValue" \
  --output text
```

Add the output as `AWS_ROLE_ARN` in GitHub → Settings → Secrets.

## Using the role in a workflow

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    uses: sc/genesis-cdk/.github/workflows/deploy-app.yml@main
    with:
      domain: example.com
      aws-region: eu-west-2
      role-arn: ${{ secrets.AWS_ROLE_ARN }}
      build-command: npm run build
```

## IAM permissions granted

The role is granted least-privilege permissions for everything CDK needs to deploy site stacks:

| Service | Actions |
|---|---|
| S3 | Bucket and object management |
| CloudFront | Distribution and invalidation management |
| Route53 | Record set changes within the hosted zone |
| ACM | Read-only (describe, list, get) |
| SSM | `GetParameter` / `GetParameters` under `/{domain}/*` |
| CloudFormation | Full stack lifecycle |
| IAM | Create/manage roles prefixed `genesis-cdk-*` |
| Lambda | Function lifecycle (required for `Backend` stacks) |
