
> sconi@0.1.0 cdk
> cdk synth

Resources:
  47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: aws-cdk:cr-owned:ba3b4708
          Value: "true"
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/47564ad7-5480-41f3-98a9-e5a1f8f2e7fe/site_bucket/Resource
  47564ad7548041f398a9e5a1f8f2e7fesitebucketPolicyB849004D:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket:
        Ref: 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
      PolicyDocument:
        Statement:
          - Action: "*"
            Condition:
              NumericLessThan:
                s3:TlsVersion:
                  - "1.2"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                        - Arn
                    - /*
          - Action: "*"
            Condition:
              Bool:
                aws:SecureTransport:
                  - "false"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                        - Arn
                    - /*
          - Action: s3:GetObject
            Effect: Allow
            Principal:
              CanonicalUser:
                Fn::GetAtt:
                  - 47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstOrigin1S3Origin5A162378
                  - S3CanonicalUserId
            Resource:
              Fn::Join:
                - ""
                - - Fn::GetAtt:
                      - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                      - Arn
                  - /*
        Version: "2012-10-17"
    Metadata:
      aws:cdk:path: Default/47564ad7-5480-41f3-98a9-e5a1f8f2e7fe/site_bucket/Policy/Resource
  47564ad7548041f398a9e5a1f8f2e7fedeploywebsiteAwsCliLayer94919467:
    Type: AWS::Lambda::LayerVersion
    Properties:
      Content:
        S3Bucket:
          Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
        S3Key: c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      Description: /opt/awscli/aws
    Metadata:
      aws:cdk:path: Default/47564ad7-5480-41f3-98a9-e5a1f8f2e7fe/deploy_website/AwsCliLayer/Resource
      aws:asset:path: asset.c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      aws:asset:is-bundled: false
      aws:asset:property: Content
  47564ad7548041f398a9e5a1f8f2e7fedeploywebsiteCustomResource256MiB1024MiBE773F1B6:
    Type: Custom::CDKBucketDeployment
    Properties:
      ServiceToken:
        Fn::GetAtt:
          - CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB7E292AF1
          - Arn
      SourceBucketNames:
        - Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
      SourceObjectKeys:
        - 045318449f83e13fab91e53bb1f784266d9e18167240ea0814195983ca1b06cf.zip
      DestinationBucketName:
        Ref: 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
      WaitForDistributionInvalidation: true
      Prune: true
      OutputObjectKeys: true
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/47564ad7-5480-41f3-98a9-e5a1f8f2e7fe/deploy_website/CustomResource-256MiB-1024MiB/Default
  47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstOrigin1S3Origin5A162378:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: Identity for 47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstOrigin1461FEB8E
    Metadata:
      aws:cdk:path: Default/47564ad7-5480-41f3-98a9-e5a1f8f2e7fe/cloudfront_dst/Origin1/S3Origin/Resource
  47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstDB9DBADC:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Aliases:
          - sconi.io
        Comment: Default | undefined
        DefaultCacheBehavior:
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          Compress: true
          TargetOriginId: 47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstOrigin1461FEB8E
          ViewerProtocolPolicy: redirect-to-https
        DefaultRootObject: index.html
        Enabled: true
        HttpVersion: http2
        IPV6Enabled: true
        Origins:
          - DomainName:
              Fn::GetAtt:
                - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                - RegionalDomainName
            Id: 47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstOrigin1461FEB8E
            S3OriginConfig:
              OriginAccessIdentity:
                Fn::Join:
                  - ""
                  - - origin-access-identity/cloudfront/
                    - Ref: 47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstOrigin1S3Origin5A162378
        PriceClass: PriceClass_100
        ViewerCertificate:
          AcmCertificateArn: arn:aws:acm:us-east-1:959067479367:certificate/30d2f058-f625-4af4-84d1-981c9f905484
          MinimumProtocolVersion: TLSv1.2_2019
          SslSupportMethod: sni-only
    Metadata:
      aws:cdk:path: Default/47564ad7-5480-41f3-98a9-e5a1f8f2e7fe/cloudfront_dst/Resource
  47564ad7548041f398a9e5a1f8f2e7fecloudfrontarecordB1241E50:
    Type: AWS::Route53::RecordSet
    Properties:
      AliasTarget:
        DNSName:
          Fn::GetAtt:
            - 47564ad7548041f398a9e5a1f8f2e7fecloudfrontdstDB9DBADC
            - DomainName
        HostedZoneId:
          Fn::FindInMap:
            - AWSCloudFrontPartitionHostedZoneIdMap
            - Ref: AWS::Partition
            - zoneId
      Comment: A Record to cloudfront for sconi.io
      HostedZoneId: Z0367863FTQN44N92WNV
      Name: sconi.io.
      Type: A
    Metadata:
      aws:cdk:path: Default/47564ad7-5480-41f3-98a9-e5a1f8f2e7fe/cloudfront_arecord/Resource
  CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBServiceRole6F147AFE:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Action: sts:AssumeRole
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
        Version: "2012-10-17"
      ManagedPolicyArns:
        - Fn::Join:
            - ""
            - - "arn:"
              - Ref: AWS::Partition
              - :iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Metadata:
      aws:cdk:path: Default/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB/ServiceRole/Resource
  CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBServiceRoleDefaultPolicy1026237E:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action:
              - s3:GetBucket*
              - s3:GetObject*
              - s3:List*
            Effect: Allow
            Resource:
              - Fn::Join:
                  - ""
                  - - "arn:"
                    - Ref: AWS::Partition
                    - ":s3:::"
                    - Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
                    - /*
              - Fn::Join:
                  - ""
                  - - "arn:"
                    - Ref: AWS::Partition
                    - ":s3:::"
                    - Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
          - Action:
              - s3:Abort*
              - s3:DeleteObject*
              - s3:GetBucket*
              - s3:GetObject*
              - s3:List*
              - s3:PutObject
              - s3:PutObjectLegalHold
              - s3:PutObjectRetention
              - s3:PutObjectTagging
              - s3:PutObjectVersionTagging
            Effect: Allow
            Resource:
              - Fn::GetAtt:
                  - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                  - Arn
              - Fn::GetAtt:
                  - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                  - Arn
              - Fn::GetAtt:
                  - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                  - Arn
              - Fn::GetAtt:
                  - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                        - Arn
                    - /*
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                        - Arn
                    - /*
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 47564ad7548041f398a9e5a1f8f2e7fesitebucket22B3C0B2
                        - Arn
                    - /*
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                        - Arn
                    - /*
        Version: "2012-10-17"
      PolicyName: CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBServiceRoleDefaultPolicy1026237E
      Roles:
        - Ref: CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBServiceRole6F147AFE
    Metadata:
      aws:cdk:path: Default/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB/ServiceRole/DefaultPolicy/Resource
  CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB7E292AF1:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        S3Bucket:
          Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
        S3Key: 3423a042b818e31c1e34a19d6689ab2e5f9b70fcbe9e71df66f241b20a200bd9.zip
      Environment:
        Variables:
          AWS_CA_BUNDLE: /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
      EphemeralStorage:
        Size: 1024
      Handler: index.handler
      Layers:
        - Ref: 47564ad7548041f398a9e5a1f8f2e7fedeploywebsiteAwsCliLayer94919467
      MemorySize: 256
      Role:
        Fn::GetAtt:
          - CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBServiceRole6F147AFE
          - Arn
      Runtime: python3.13
      Timeout: 900
    DependsOn:
      - CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBServiceRoleDefaultPolicy1026237E
      - CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBServiceRole6F147AFE
    Metadata:
      aws:cdk:path: Default/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB/Resource
      aws:asset:path: asset.3423a042b818e31c1e34a19d6689ab2e5f9b70fcbe9e71df66f241b20a200bd9
      aws:asset:is-bundled: false
      aws:asset:property: Code
  CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiBLogGroup0FB63AB3:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName:
        Fn::Join:
          - ""
          - - /aws/lambda/
            - Ref: CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB7E292AF1
      RetentionInDays: 731
    UpdateReplacePolicy: Retain
    DeletionPolicy: Retain
    Metadata:
      aws:cdk:path: Default/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB/LogGroup/Resource
  33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: aws-cdk:cr-owned:84a83340
          Value: "true"
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/33e05379-483c-4d39-8e03-62f66eec49c6/site_bucket/Resource
  33e05379483c4d398e0362f66eec49c6sitebucketPolicy33A13FEC:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket:
        Ref: 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
      PolicyDocument:
        Statement:
          - Action: "*"
            Condition:
              NumericLessThan:
                s3:TlsVersion:
                  - "1.2"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                        - Arn
                    - /*
          - Action: "*"
            Condition:
              Bool:
                aws:SecureTransport:
                  - "false"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                        - Arn
                    - /*
          - Action: s3:GetObject
            Effect: Allow
            Principal:
              CanonicalUser:
                Fn::GetAtt:
                  - 33e05379483c4d398e0362f66eec49c6cloudfrontdstOrigin1S3Origin5E438E65
                  - S3CanonicalUserId
            Resource:
              Fn::Join:
                - ""
                - - Fn::GetAtt:
                      - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                      - Arn
                  - /*
        Version: "2012-10-17"
    Metadata:
      aws:cdk:path: Default/33e05379-483c-4d39-8e03-62f66eec49c6/site_bucket/Policy/Resource
  33e05379483c4d398e0362f66eec49c6deploywebsiteAwsCliLayerAD4DA1CD:
    Type: AWS::Lambda::LayerVersion
    Properties:
      Content:
        S3Bucket:
          Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
        S3Key: c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      Description: /opt/awscli/aws
    Metadata:
      aws:cdk:path: Default/33e05379-483c-4d39-8e03-62f66eec49c6/deploy_website/AwsCliLayer/Resource
      aws:asset:path: asset.c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      aws:asset:is-bundled: false
      aws:asset:property: Content
  33e05379483c4d398e0362f66eec49c6deploywebsiteCustomResource256MiB1024MiB9449D0CB:
    Type: Custom::CDKBucketDeployment
    Properties:
      ServiceToken:
        Fn::GetAtt:
          - CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB7E292AF1
          - Arn
      SourceBucketNames:
        - Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
      SourceObjectKeys:
        - f6de00f7e791c41361d6d0ca3673417f1c77d33f6eb89eaa7091c1583e50ea53.zip
      DestinationBucketName:
        Ref: 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
      WaitForDistributionInvalidation: true
      Prune: true
      OutputObjectKeys: true
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/33e05379-483c-4d39-8e03-62f66eec49c6/deploy_website/CustomResource-256MiB-1024MiB/Default
  33e05379483c4d398e0362f66eec49c6cloudfrontdstOrigin1S3Origin5E438E65:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: Identity for 33e05379483c4d398e0362f66eec49c6cloudfrontdstOrigin15ECF65F0
    Metadata:
      aws:cdk:path: Default/33e05379-483c-4d39-8e03-62f66eec49c6/cloudfront_dst/Origin1/S3Origin/Resource
  33e05379483c4d398e0362f66eec49c6cloudfrontdst144FF4DA:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Aliases:
          - bordle
        Comment: Default | undefined
        DefaultCacheBehavior:
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          Compress: true
          TargetOriginId: 33e05379483c4d398e0362f66eec49c6cloudfrontdstOrigin15ECF65F0
          ViewerProtocolPolicy: redirect-to-https
        DefaultRootObject: index.html
        Enabled: true
        HttpVersion: http2
        IPV6Enabled: true
        Origins:
          - DomainName:
              Fn::GetAtt:
                - 33e05379483c4d398e0362f66eec49c6sitebucketCD4E24CC
                - RegionalDomainName
            Id: 33e05379483c4d398e0362f66eec49c6cloudfrontdstOrigin15ECF65F0
            S3OriginConfig:
              OriginAccessIdentity:
                Fn::Join:
                  - ""
                  - - origin-access-identity/cloudfront/
                    - Ref: 33e05379483c4d398e0362f66eec49c6cloudfrontdstOrigin1S3Origin5E438E65
        PriceClass: PriceClass_100
        ViewerCertificate:
          AcmCertificateArn: arn:aws:acm:us-east-1:959067479367:certificate/30d2f058-f625-4af4-84d1-981c9f905484
          MinimumProtocolVersion: TLSv1.2_2019
          SslSupportMethod: sni-only
    Metadata:
      aws:cdk:path: Default/33e05379-483c-4d39-8e03-62f66eec49c6/cloudfront_dst/Resource
  33e05379483c4d398e0362f66eec49c6cloudfrontarecord81A8D69A:
    Type: AWS::Route53::RecordSet
    Properties:
      AliasTarget:
        DNSName:
          Fn::GetAtt:
            - 33e05379483c4d398e0362f66eec49c6cloudfrontdst144FF4DA
            - DomainName
        HostedZoneId:
          Fn::FindInMap:
            - AWSCloudFrontPartitionHostedZoneIdMap
            - Ref: AWS::Partition
            - zoneId
      Comment: A Record to cloudfront for bordle
      HostedZoneId: Z0367863FTQN44N92WNV
      Name: bordle.sconi.io.
      Type: A
    Metadata:
      aws:cdk:path: Default/33e05379-483c-4d39-8e03-62f66eec49c6/cloudfront_arecord/Resource
  9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: aws-cdk:cr-owned:dec21f42
          Value: "true"
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/9cb27824-d36b-45d6-8f3a-d7109e99d5fe/site_bucket/Resource
  9cb27824d36b45d68f3ad7109e99d5fesitebucketPolicyD71973A0:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket:
        Ref: 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
      PolicyDocument:
        Statement:
          - Action: "*"
            Condition:
              NumericLessThan:
                s3:TlsVersion:
                  - "1.2"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                        - Arn
                    - /*
          - Action: "*"
            Condition:
              Bool:
                aws:SecureTransport:
                  - "false"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                        - Arn
                    - /*
          - Action: s3:GetObject
            Effect: Allow
            Principal:
              CanonicalUser:
                Fn::GetAtt:
                  - 9cb27824d36b45d68f3ad7109e99d5fecloudfrontdstOrigin1S3Origin9F4DDAE1
                  - S3CanonicalUserId
            Resource:
              Fn::Join:
                - ""
                - - Fn::GetAtt:
                      - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                      - Arn
                  - /*
        Version: "2012-10-17"
    Metadata:
      aws:cdk:path: Default/9cb27824-d36b-45d6-8f3a-d7109e99d5fe/site_bucket/Policy/Resource
  9cb27824d36b45d68f3ad7109e99d5fedeploywebsiteAwsCliLayer653B2200:
    Type: AWS::Lambda::LayerVersion
    Properties:
      Content:
        S3Bucket:
          Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
        S3Key: c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      Description: /opt/awscli/aws
    Metadata:
      aws:cdk:path: Default/9cb27824-d36b-45d6-8f3a-d7109e99d5fe/deploy_website/AwsCliLayer/Resource
      aws:asset:path: asset.c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      aws:asset:is-bundled: false
      aws:asset:property: Content
  9cb27824d36b45d68f3ad7109e99d5fedeploywebsiteCustomResource256MiB1024MiBADE5079E:
    Type: Custom::CDKBucketDeployment
    Properties:
      ServiceToken:
        Fn::GetAtt:
          - CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB7E292AF1
          - Arn
      SourceBucketNames:
        - Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
      SourceObjectKeys:
        - 325824d18a4fba59407202891635b513e2f7ed2d81a4f363fb26236429e9de49.zip
      DestinationBucketName:
        Ref: 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
      WaitForDistributionInvalidation: true
      Prune: true
      OutputObjectKeys: true
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/9cb27824-d36b-45d6-8f3a-d7109e99d5fe/deploy_website/CustomResource-256MiB-1024MiB/Default
  9cb27824d36b45d68f3ad7109e99d5fecloudfrontdstOrigin1S3Origin9F4DDAE1:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: Identity for 9cb27824d36b45d68f3ad7109e99d5fecloudfrontdstOrigin1E983777B
    Metadata:
      aws:cdk:path: Default/9cb27824-d36b-45d6-8f3a-d7109e99d5fe/cloudfront_dst/Origin1/S3Origin/Resource
  9cb27824d36b45d68f3ad7109e99d5fecloudfrontdst4C35DE8F:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Aliases:
          - isaacconibear
        Comment: Default | undefined
        DefaultCacheBehavior:
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          Compress: true
          TargetOriginId: 9cb27824d36b45d68f3ad7109e99d5fecloudfrontdstOrigin1E983777B
          ViewerProtocolPolicy: redirect-to-https
        DefaultRootObject: index.html
        Enabled: true
        HttpVersion: http2
        IPV6Enabled: true
        Origins:
          - DomainName:
              Fn::GetAtt:
                - 9cb27824d36b45d68f3ad7109e99d5fesitebucketBB8D1905
                - RegionalDomainName
            Id: 9cb27824d36b45d68f3ad7109e99d5fecloudfrontdstOrigin1E983777B
            S3OriginConfig:
              OriginAccessIdentity:
                Fn::Join:
                  - ""
                  - - origin-access-identity/cloudfront/
                    - Ref: 9cb27824d36b45d68f3ad7109e99d5fecloudfrontdstOrigin1S3Origin9F4DDAE1
        PriceClass: PriceClass_100
        ViewerCertificate:
          AcmCertificateArn: arn:aws:acm:us-east-1:959067479367:certificate/30d2f058-f625-4af4-84d1-981c9f905484
          MinimumProtocolVersion: TLSv1.2_2019
          SslSupportMethod: sni-only
    Metadata:
      aws:cdk:path: Default/9cb27824-d36b-45d6-8f3a-d7109e99d5fe/cloudfront_dst/Resource
  9cb27824d36b45d68f3ad7109e99d5fecloudfrontarecord6DDE8D7C:
    Type: AWS::Route53::RecordSet
    Properties:
      AliasTarget:
        DNSName:
          Fn::GetAtt:
            - 9cb27824d36b45d68f3ad7109e99d5fecloudfrontdst4C35DE8F
            - DomainName
        HostedZoneId:
          Fn::FindInMap:
            - AWSCloudFrontPartitionHostedZoneIdMap
            - Ref: AWS::Partition
            - zoneId
      Comment: A Record to cloudfront for isaacconibear
      HostedZoneId: Z0367863FTQN44N92WNV
      Name: isaacconibear.sconi.io.
      Type: A
    Metadata:
      aws:cdk:path: Default/9cb27824-d36b-45d6-8f3a-d7109e99d5fe/cloudfront_arecord/Resource
  195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: aws-cdk:cr-owned:14502801
          Value: "true"
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/195ccdbb-aed6-42ac-ab8b-f4e35c5c5234/site_bucket/Resource
  195ccdbbaed642acab8bf4e35c5c5234sitebucketPolicy3C7248E0:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket:
        Ref: 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
      PolicyDocument:
        Statement:
          - Action: "*"
            Condition:
              NumericLessThan:
                s3:TlsVersion:
                  - "1.2"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                        - Arn
                    - /*
          - Action: "*"
            Condition:
              Bool:
                aws:SecureTransport:
                  - "false"
            Effect: Deny
            Principal:
              AWS: "*"
            Resource:
              - Fn::GetAtt:
                  - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                  - Arn
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                        - Arn
                    - /*
          - Action: s3:GetObject
            Effect: Allow
            Principal:
              CanonicalUser:
                Fn::GetAtt:
                  - 195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstOrigin1S3OriginB9BE2790
                  - S3CanonicalUserId
            Resource:
              Fn::Join:
                - ""
                - - Fn::GetAtt:
                      - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                      - Arn
                  - /*
        Version: "2012-10-17"
    Metadata:
      aws:cdk:path: Default/195ccdbb-aed6-42ac-ab8b-f4e35c5c5234/site_bucket/Policy/Resource
  195ccdbbaed642acab8bf4e35c5c5234deploywebsiteAwsCliLayer49967879:
    Type: AWS::Lambda::LayerVersion
    Properties:
      Content:
        S3Bucket:
          Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
        S3Key: c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      Description: /opt/awscli/aws
    Metadata:
      aws:cdk:path: Default/195ccdbb-aed6-42ac-ab8b-f4e35c5c5234/deploy_website/AwsCliLayer/Resource
      aws:asset:path: asset.c49d356cac773d491c5f7ac148995a1181498a8e289429f8612a7f7e3814f535.zip
      aws:asset:is-bundled: false
      aws:asset:property: Content
  195ccdbbaed642acab8bf4e35c5c5234deploywebsiteCustomResource256MiB1024MiB021FB4E1:
    Type: Custom::CDKBucketDeployment
    Properties:
      ServiceToken:
        Fn::GetAtt:
          - CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C256MiB1024MiB7E292AF1
          - Arn
      SourceBucketNames:
        - Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
      SourceObjectKeys:
        - ceddb806edfd98d03181cd9fa1d73606894916e20fa84285a5d7dca4aeace433.zip
      DestinationBucketName:
        Ref: 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
      WaitForDistributionInvalidation: true
      Prune: true
      OutputObjectKeys: true
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: Default/195ccdbb-aed6-42ac-ab8b-f4e35c5c5234/deploy_website/CustomResource-256MiB-1024MiB/Default
  195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstOrigin1S3OriginB9BE2790:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: Identity for 195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstOrigin1BC996116
    Metadata:
      aws:cdk:path: Default/195ccdbb-aed6-42ac-ab8b-f4e35c5c5234/cloudfront_dst/Origin1/S3Origin/Resource
  195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstDCC3B401:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Aliases:
          - canigetaroundin
        Comment: Default | undefined
        DefaultCacheBehavior:
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          Compress: true
          TargetOriginId: 195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstOrigin1BC996116
          ViewerProtocolPolicy: redirect-to-https
        DefaultRootObject: index.html
        Enabled: true
        HttpVersion: http2
        IPV6Enabled: true
        Origins:
          - DomainName:
              Fn::GetAtt:
                - 195ccdbbaed642acab8bf4e35c5c5234sitebucket980CB8A0
                - RegionalDomainName
            Id: 195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstOrigin1BC996116
            S3OriginConfig:
              OriginAccessIdentity:
                Fn::Join:
                  - ""
                  - - origin-access-identity/cloudfront/
                    - Ref: 195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstOrigin1S3OriginB9BE2790
        PriceClass: PriceClass_100
        ViewerCertificate:
          AcmCertificateArn: arn:aws:acm:us-east-1:959067479367:certificate/30d2f058-f625-4af4-84d1-981c9f905484
          MinimumProtocolVersion: TLSv1.2_2019
          SslSupportMethod: sni-only
    Metadata:
      aws:cdk:path: Default/195ccdbb-aed6-42ac-ab8b-f4e35c5c5234/cloudfront_dst/Resource
  195ccdbbaed642acab8bf4e35c5c5234cloudfrontarecord4B26FE67:
    Type: AWS::Route53::RecordSet
    Properties:
      AliasTarget:
        DNSName:
          Fn::GetAtt:
            - 195ccdbbaed642acab8bf4e35c5c5234cloudfrontdstDCC3B401
            - DomainName
        HostedZoneId:
          Fn::FindInMap:
            - AWSCloudFrontPartitionHostedZoneIdMap
            - Ref: AWS::Partition
            - zoneId
      Comment: A Record to cloudfront for canigetaroundin
      HostedZoneId: Z0367863FTQN44N92WNV
      Name: canigetaroundin.sconi.io.
      Type: A
    Metadata:
      aws:cdk:path: Default/195ccdbb-aed6-42ac-ab8b-f4e35c5c5234/cloudfront_arecord/Resource
  CDKMetadata:
    Type: AWS::CDK::Metadata
    Properties:
      Analytics: v2:deflate64:H4sIAAAAAAAA/+1YS4/jNgz+LavjQnGTDObQ3DLZbrHATDeIB70YQaBIjKMZWTQkKoHX8H8v5Ndk9tUeWrSLBkggiaQo8pNEUp4n89ltMn0jzn4i1fPE6H1SpyTkM9+Ax+AkZOwt23Jx9rva3yT1XZDPQFnNHBR4EmaNRsuKLZgCTw4r1vB/gLflq4PtluZd08lkNdu3Q7Zgb1sVf314obNT1mu+Ex6ybcP9za5WUBqsCrCUdMx3I4EL74F8soxNw40o9kok9epg70UF7ndwXqPlqba5AUL7PlhJGm1WsxC0am3gzERZzxYdygzsSTu0Uf8oEPWugyvRQ08jXQCGQcKhGRgFFOiqVH8aCFAeoQAnTEroRA4XrFMpX3pp2Fsg3xMO2oCvPEExGIH5rw5D2Q8lqkHLUVhlwA2mBBttG+EWSj0ACSVIdC5ycgG2X2dFBCLnis4VnSs6fzs6W34Rgf4UnB8JiF8urX91HIRS95eedjF/wKHh0mBQB4eWkvqd9uT0PvQISSwu4FBwEMHQHRzFSaNji5qh07m2g38azuDWDgklvuQvB0o7kDQhnByJSs8azhQWQtvfRAEDGBIc6YOWgkaUtdVFKAaFfTJhC/Z4n55myXw3n85+Zpx5b9JQlujoAeiI8ex7qydoTcU4K52WsDLCx4XW42A3m05ffNog0sf9E8iXLHn1/er7/8r3Lf/YeraUErz/oMCSpiqrGz782sCxiuHifQwXXxOPEpdBpOEOA8HtTVIvNyDRqS/Cyie0Y+YRLocx3rbiEa5v7M114r85sT0M3ZamsfbXokjqDRrIaia8DwWouyrel9JpK3UpzFJKDOM6nUycsGwTUW8OK4QVOaj2Kul4U7L6Fa1aul52yG6PuB6WGC5gVvdcIiGPH6zRFkbemBi/y/y+3h+N2+0WGuD9mzHuwQDBI27a2uYzZL4kK5WSIIinxb9a9j9Mbj3vnG64wdwn9X1fZsUasO9+dq4HiWZ40+7aYnEnzl4anSzPfmV0W1W9jo/tOzglkWub81XwhMXlJwR+8e/vT8eM/QdRltrmDbeoIHnyP53mt8ksmb558lpP+pIv2XTtHyfjQv+0EAAA
    Metadata:
      aws:cdk:path: Default/CDKMetadata/Default
    Condition: CDKMetadataAvailable
Mappings:
  AWSCloudFrontPartitionHostedZoneIdMap:
    aws:
      zoneId: Z2FDTNDATAQYW2
    aws-cn:
      zoneId: Z3RFFRIM2A3IF5
Conditions:
  CDKMetadataAvailable:
    Fn::Or:
      - Fn::Or:
          - Fn::Equals:
              - Ref: AWS::Region
              - af-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-east-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-northeast-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-northeast-2
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-northeast-3
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-south-2
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-southeast-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-southeast-2
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-southeast-3
      - Fn::Or:
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-southeast-4
          - Fn::Equals:
              - Ref: AWS::Region
              - ca-central-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ca-west-1
          - Fn::Equals:
              - Ref: AWS::Region
              - cn-north-1
          - Fn::Equals:
              - Ref: AWS::Region
              - cn-northwest-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-central-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-central-2
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-north-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-south-2
      - Fn::Or:
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-west-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-west-2
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-west-3
          - Fn::Equals:
              - Ref: AWS::Region
              - il-central-1
          - Fn::Equals:
              - Ref: AWS::Region
              - me-central-1
          - Fn::Equals:
              - Ref: AWS::Region
              - me-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - sa-east-1
          - Fn::Equals:
              - Ref: AWS::Region
              - us-east-1
          - Fn::Equals:
              - Ref: AWS::Region
              - us-east-2
          - Fn::Equals:
              - Ref: AWS::Region
              - us-west-1
      - Fn::Equals:
          - Ref: AWS::Region
          - us-west-2
Parameters:
  BootstrapVersion:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /cdk-bootstrap/hnb659fds/version
    Description: Version of the CDK Bootstrap resources in this environment, automatically retrieved from SSM Parameter Store. [cdk:skip]

