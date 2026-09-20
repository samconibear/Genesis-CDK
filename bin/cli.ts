#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const command = args[0];
const isCore = args.includes('--core');

const domainFlagIndex = args.findIndex(a => a.startsWith('--domain='));
const domain = domainFlagIndex !== -1
  ? args[domainFlagIndex].slice('--domain='.length)
  : undefined;

if (command !== 'init') {
  console.error('Usage: genesis-cdk init [--core|--site] --domain=<domain>');
  process.exit(1);
}

if (!domain) {
  console.error('Error: --domain=<domain> is required (e.g. --domain=example.com)');
  process.exit(1);
}

const stackName = domain.replace(/\./g, '-');

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

const certStack = new CertStack(app, '${stackName}-cert', {
  accountId: process.env.CDK_DEFAULT_ACCOUNT ?? '',
  domain: '${domain}',
});

new CiRole(certStack, 'CiRole', {
  domain: '${domain}',
  accountId: process.env.CDK_DEFAULT_ACCOUNT ?? '',
  githubRepos: [process.env.GITHUB_REPOSITORY ?? 'my-org/my-repo'],
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

const stack = new cdk.Stack(app, '${stackName}', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

new RootSite({
  scope: stack,
  domain: '${domain}',
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

const stack = new cdk.Stack(app, '${stackName}', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

new SubSite({
  scope: stack,
  domain: '${domain}',
  src: './dist',
});
`
    );
    console.log('Created bin/app.ts');
  }
}

if (isCore) {
  console.log('\nDone. Next steps:');
  console.log(`  1. Deploy the certificate stack once: cdk deploy --all --app "npx ts-node --esm bin/cert.ts"`);
  console.log('  2. Update nameservers at your registrar to point to Route53, then wait for DNS propagation');
  console.log(`  3. Deploy your site: cdk deploy ${stackName}`);
} else {
  console.log('\nDone. Next steps:');
  console.log('  1. Edit bin/app.ts — set the src path');
  console.log(`  2. Deploy: cdk deploy ${stackName}`);
}
