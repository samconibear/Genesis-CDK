(
  # cert stack
  cd cert-stack
  cdk deploy CertStack --outputs-file "../assets/cert-outputs.json"
)

(
  # app stack
  CERT_ARN=$(jq -r '.CertStack.certArn' ./assets/cert-outputs.json)
  ZONE_ID=$(jq -r '.CertStack.zoneId' ./assets/cert-outputs.json)
  cd cert-stack
  cdk deploy SconiStack \
    --context certArn=$CERT_ARN \
    --context zoneId=$ZONE_ID

)