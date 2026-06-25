import { aws_iam, CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CiRoleProps {
  /** The root domain, used to scope SSM and ACM permissions (e.g. 'example.com') */
  domain: string;
  /** GitHub repo in 'owner/repo' format */
  githubRepo: string;
  /** AWS account ID, used to scope IAM resource ARNs */
  accountId: string;
}

export class CiRole extends Construct {
  readonly roleArn: string;

  constructor(scope: Construct, id: string, props: CiRoleProps) {
    super(scope, id);

    const { domain, accountId, githubRepo } = props;
    const accountId_ = accountId ?? Stack.of(this).account;

    const oidcProvider = new aws_iam.OpenIdConnectProvider(this, 'github_oidc_provider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      // GitHub's OIDC thumbprint — stable, published by GitHub
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    const role = new aws_iam.Role(this, 'ci_role', {
      roleName: `genesis-cdk-ci-${domain}`,
      assumedBy: new aws_iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          // Scoped to the main branch of the specified repo only
          'token.actions.githubusercontent.com:sub': `repo:${githubRepo}:ref:refs/heads/main`,
        },
      }),
      maxSessionDuration: Duration.hours(1),
    });

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        's3:CreateBucket',
        's3:DeleteBucket',
        's3:PutBucketPolicy',
        's3:DeleteBucketPolicy',
        's3:PutBucketPublicAccessBlock',
        's3:GetBucketPolicy',
        's3:GetBucketLocation',
        's3:ListBucket',
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:GetEncryptionConfiguration',
        's3:PutEncryptionConfiguration',
        's3:PutLifecycleConfiguration',
        's3:GetLifecycleConfiguration',
      ],
      resources: ['arn:aws:s3:::*'],
    }));

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'cloudfront:CreateDistribution',
        'cloudfront:DeleteDistribution',
        'cloudfront:GetDistribution',
        'cloudfront:GetDistributionConfig',
        'cloudfront:UpdateDistribution',
        'cloudfront:ListDistributions',
        'cloudfront:CreateInvalidation',
        'cloudfront:CreateOriginAccessControl',
        'cloudfront:DeleteOriginAccessControl',
        'cloudfront:GetOriginAccessControl',
        'cloudfront:ListOriginAccessControls',
        'cloudfront:TagResource',
      ],
      resources: ['*'],
    }));

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'route53:ChangeResourceRecordSets',
        'route53:GetHostedZone',
        'route53:ListHostedZones',
        'route53:ListResourceRecordSets',
        'route53:GetChange',
      ],
      resources: [
        'arn:aws:route53:::hostedzone/*',
        'arn:aws:route53:::change/*',
      ],
    }));

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'acm:DescribeCertificate',
        'acm:ListCertificates',
        'acm:GetCertificate',
      ],
      resources: [`arn:aws:acm:us-east-1:${accountId_}:certificate/*`],
    }));

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
      ],
      resources: [
        `arn:aws:ssm:us-east-1:${accountId_}:parameter/${domain}/*`,
      ],
    }));

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'cloudformation:CreateStack',
        'cloudformation:UpdateStack',
        'cloudformation:DeleteStack',
        'cloudformation:DescribeStacks',
        'cloudformation:DescribeStackEvents',
        'cloudformation:DescribeStackResources',
        'cloudformation:GetTemplate',
        'cloudformation:ValidateTemplate',
        'cloudformation:CreateChangeSet',
        'cloudformation:ExecuteChangeSet',
        'cloudformation:DeleteChangeSet',
        'cloudformation:DescribeChangeSet',
        'cloudformation:GetStackPolicy',
      ],
      resources: [`arn:aws:cloudformation:*:${accountId_}:stack/*/*`],
    }));

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'iam:CreateRole',
        'iam:DeleteRole',
        'iam:AttachRolePolicy',
        'iam:DetachRolePolicy',
        'iam:PutRolePolicy',
        'iam:DeleteRolePolicy',
        'iam:GetRole',
        'iam:GetRolePolicy',
        'iam:PassRole',
        'iam:TagRole',
      ],
      resources: [`arn:aws:iam::${accountId_}:role/genesis-cdk-*`],
    }));

    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'lambda:CreateFunction',
        'lambda:DeleteFunction',
        'lambda:GetFunction',
        'lambda:UpdateFunctionCode',
        'lambda:UpdateFunctionConfiguration',
        'lambda:InvokeFunction',
        'lambda:AddPermission',
        'lambda:RemovePermission',
        'lambda:TagResource',
      ],
      resources: [`arn:aws:lambda:*:${accountId_}:function:*`],
    }));

    new CfnOutput(this, 'CiRoleArn', {
      value: role.roleArn,
      description: 'IAM role ARN for GitHub Actions — add to workflow as role-to-assume',
    });

    this.roleArn = role.roleArn;
  }
}
