import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RootSite } from './root-site';

export class SconiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope);
    const rootSite = new RootSite({
      scope: this,
      src: '../www/dist',
    });
    rootSite.subSite({
      domain: 'bordle',
      src: '../../bordle/www/dist',
    });
    rootSite.subSite({
      domain: 'isaacconibear',
      src: '../../ijc/www/dist',
    });
    rootSite.subSite({
      domain: 'canigetaroundin',
      src: '../../teetime/www/dist',
    });
  }
}
