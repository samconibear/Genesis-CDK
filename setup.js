#!/usr/bin/env node
// Run from the parent project root: node genesis-cdk/setup.js --root|--site --domain=example.com [--subdomain=blog] [--src=./dist]
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);

const isRoot = args.includes('--root');
const isSite = args.includes('--site');

if (!isRoot && !isSite) {
  console.error('Usage: node genesis-cdk/setup.js --root|--site --domain=<domain> [--subdomain=<sub>] [--src=<path>]');
  process.exit(1);
}

const domainArg = args.find(a => a.startsWith('--domain='));
const domain = domainArg?.slice('--domain='.length);

if (!domain) {
  console.error('Error: --domain=<domain> is required (e.g. --domain=example.com)');
  process.exit(1);
}

const subdomainArg = args.find(a => a.startsWith('--subdomain='));
const subdomain = subdomainArg?.slice('--subdomain='.length);

if (isSite && !subdomain) {
  console.error('Error: --subdomain=<sub> is required for --site (e.g. --subdomain=blog)');
  process.exit(1);
}

const srcArg = args.find(a => a.startsWith('--src='));
const src = srcArg?.slice('--src='.length) ?? './dist';

const stackName = domain.replace(/\./g, '-');

// Path to this repo's lib/ relative to the directory the script is run from
const scriptDir = dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const binDir = join(cwd, 'bin');
const genesisLibPath = relative(binDir, join(scriptDir, 'src', 'index.js')).replace(/\\/g, '/');

// Ensure it starts with ./ for valid relative import
const libImport = genesisLibPath.startsWith('.') ? genesisLibPath : './' + genesisLibPath;

console.log('Installing CDK dependencies...');
execSync('npm install --save aws-cdk-lib constructs', { stdio: 'inherit', cwd });
execSync('npm install --save-dev aws-cdk typescript tsx @types/node', { stdio: 'inherit', cwd });

if (!existsSync(join(cwd, 'cdk.json'))) {
  writeFileSync(
    join(cwd, 'cdk.json'),
    JSON.stringify(
      {
        app: 'npx tsx bin/app.ts',
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

if (isRoot) {
  const certPath = join(cwd, 'bin', 'cert.ts');
  if (!existsSync(certPath)) {
    writeFileSync(
      certPath,
      `#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CertStack, CiRole } from '${libImport}';

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
import { RootSite } from '${libImport}';

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
  src: '${src}',
});
`
    );
    console.log('Created bin/app.ts');
  }

  console.log('\nDone. Next steps:');
  console.log(`  1. Deploy the certificate stack once:`);
  console.log(`     cdk deploy --all --app "npx ts-node --esm bin/cert.ts"`);
  console.log('  2. Update nameservers at your registrar to point to Route53, then wait for DNS propagation');
  console.log(`  3. Deploy your site: cdk deploy ${stackName}`);
} else {
  const appPath = join(cwd, 'bin', 'app.ts');
  if (!existsSync(appPath)) {
    const siteStackName = `${subdomain}-${domain}`.replace(/\./g, '-');
    writeFileSync(
      appPath,
      `#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SubSite } from '${libImport}';

const app = new cdk.App();

const stack = new cdk.Stack(app, '${siteStackName}', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

new SubSite({
  scope: stack,
  domain: '${subdomain}',
  src: '${src}',
});
`
    );
    console.log('Created bin/app.ts');
  }

  console.log('\nDone. Next steps:');
  console.log(`  1. Deploy: cdk deploy ${subdomain}-${stackName}`);
}
