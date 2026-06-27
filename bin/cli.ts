#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const command = args[0];
const isCore = args.includes('--core');

if (command !== 'init') {
  console.error('Usage: genesis-cdk init [--core|--site]');
  process.exit(1);
}

const cwd = process.cwd();

console.log('Installing dependencies...');
execSync('npm install --save aws-cdk-lib constructs', { stdio: 'inherit', cwd });
execSync('npm install --save-dev aws-cdk typescript ts-node @types/node', { stdio: 'inherit', cwd });

if (!existsSync(join(cwd, 'cdk.json'))) {
  writeFileSync(
    join(cwd, 'cdk.json'),
    JSON.stringify(
      {
        app: 'npx ts-node --esm bin/app.ts',
        context: {
          '@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId': true,
          '@aws-cdk/core:stackRelativeExports': true,
        },
      },
      null,
      2
    ) + '\n'
  );
  console.log('Created cdk.json');
}

if (!existsSync(join(cwd, 'tsconfig.json'))) {
  writeFileSync(
    join(cwd, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          lib: ['es2022'],
          strict: true,
          skipLibCheck: true,
          outDir: 'cdk.out',
        },
        include: ['bin/**/*.ts'],
        exclude: ['node_modules', 'cdk.out'],
      },
      null,
      2
    ) + '\n'
  );
  console.log('Created tsconfig.json');
}

mkdirSync(join(cwd, 'bin'), { recursive: true });

if (isCore) {
  const certPath = join(cwd, 'bin', 'cert.ts');
  if (!existsSync(certPath)) {
    writeFileSync(
      certPath,
      `#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CertStack, CiRole } from 'genesis-cdk';

const app = new cdk.App();

const certStack = new CertStack(app, 'CertStack', {
  accountId: process.env.CDK_DEFAULT_ACCOUNT ?? '',
  domain: process.env.DOMAIN ?? 'example.com',
});

new CiRole(certStack, 'CiRole', {
  domain: process.env.DOMAIN ?? 'example.com',
  accountId: process.env.CDK_DEFAULT_ACCOUNT ?? '',
  githubRepo: process.env.GITHUB_REPOSITORY ?? 'my-org/my-repo',
});
`
    );
    console.log('Created bin/cert.ts');
  }

  const appPath = join(cwd, 'bin', 'app.ts');
  if (!existsSync(appPath)) {
    writeFileSync(
      appPath,
      `#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RootSite } from 'genesis-cdk';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'AppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

new RootSite({
  scope: stack,
  domain: process.env.DOMAIN ?? 'example.com',
  src: './dist',
});
`
    );
    console.log('Created bin/app.ts');
  }
} else {
  const appPath = join(cwd, 'bin', 'app.ts');
  if (!existsSync(appPath)) {
    writeFileSync(
      appPath,
      `#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SubSite } from 'genesis-cdk';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'AppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

new SubSite({
  scope: stack,
  domain: 'sub',
  src: './dist',
});
`
    );
    console.log('Created bin/app.ts');
  }
}

if (isCore) {
  console.log('\nDone. Next steps:');
  console.log('  1. Set your DOMAIN environment variable (e.g. export DOMAIN=example.com)');
  console.log('  2. Deploy the certificate stack once: cdk deploy --all --app "npx ts-node --esm bin/cert.ts"');
  console.log('  3. Update nameservers at your registrar to point to Route53, then wait for DNS propagation');
  console.log('  4. Deploy your site:                  cdk deploy AppStack');
} else {
  console.log('\nDone. Next steps:');
  console.log('  1. Edit bin/app.ts — set the subdomain label and src path');
  console.log('  2. Deploy: cdk deploy AppStack');
}
