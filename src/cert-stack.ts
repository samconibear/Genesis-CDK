import {
  aws_route53,
  aws_certificatemanager,
  aws_ssm,
  aws_iam,
  Stack,
  StackProps,
  CfnOutput,
  Duration,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CertStackProps extends StackProps {
  domain: string;
  accountId: string;
  githubRepo: string; // format: 'owner/repo'
}

export const ssmParamName = {
  certArn: (domain: string) => `/${domain}/certArn`,
  hostedZoneId: (domain: string) => `/${domain}/hostedZoneId`,
};

export class CertStack extends Stack {
  constructor(scope: Construct, id: string, props: CertStackProps) {
    super(scope, id, {
      ...props,
      env: { account: props.accountId, region: 'us-east-1' },
    });

    const hostedZone = new aws_route53.HostedZone(this, 'hosted_zone', {
      zoneName: props.domain,
    });

    const certificate = new aws_certificatemanager.Certificate(this, 'certificate', {
      domainName: props.domain,
      subjectAlternativeNames: [`*.${props.domain}`],
      validation: aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    new aws_ssm.StringParameter(this, 'cert_arn_param', {
      parameterName: ssmParamName.certArn(props.domain),
      stringValue: certificate.certificateArn,
      description: `ACM certificate ARN for ${props.domain}`,
    });

    new aws_ssm.StringParameter(this, 'hosted_zone_id_param', {
      parameterName: ssmParamName.hostedZoneId(props.domain),
      stringValue: hostedZone.hostedZoneId,
      description: `Route53 hosted zone ID for ${props.domain}`,
    });

    this.createCiRole(props.domain, props.accountId, props.githubRepo);
  }

  private createCiRole(domain: string, accountId: string, githubRepo: string) {
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

    // S3: manage site buckets
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

    // CloudFront: manage distributions
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

    // Route53: manage records
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

    // ACM: read the certificate created by CertStack
    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'acm:DescribeCertificate',
        'acm:ListCertificates',
        'acm:GetCertificate',
      ],
      resources: [`arn:aws:acm:us-east-1:${accountId}:certificate/*`],
    }));

    // SSM: read the cert/zone params written by CertStack
    role.addToPolicy(new aws_iam.PolicyStatement({
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
      ],
      resources: [
        `arn:aws:ssm:us-east-1:${accountId}:parameter/${domain}/*`,
      ],
    }));

    // CloudFormation: deploy the app stack
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
      resources: [`arn:aws:cloudformation:*:${accountId}:stack/*/*`],
    }));

    // IAM: CDK needs to create/manage the Lambda execution role for BucketDeployment
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
      resources: [`arn:aws:iam::${accountId}:role/genesis-cdk-*`],
    }));

    // Lambda: CDK BucketDeployment uses a Lambda-backed custom resource
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
      resources: [`arn:aws:lambda:*:${accountId}:function:*`],
    }));

    new CfnOutput(this, 'CiRoleArn', {
      value: role.roleArn,
      description: 'IAM role ARN for GitHub Actions — add to workflow as role-to-assume',
    });
  }
}
