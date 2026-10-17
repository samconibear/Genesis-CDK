import { defineConfig } from 'vitepress';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarPath = resolve(__dirname, '../typedoc-sidebar.json');
const apiSidebar = existsSync(sidebarPath)
  ? JSON.parse(readFileSync(sidebarPath, 'utf-8'))
  : [];

export default defineConfig({
  title: 'genesis-cdk',
  description: 'CDK constructs for deploying static sites and Lambda-backed APIs on AWS.',
  base: '/genesis-cdk/',

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Constructs',
          items: [
            { text: 'CertStack', link: '/guide/cert-stack' },
            { text: 'RootSite', link: '/guide/root-site' },
            { text: 'SubSite', link: '/guide/sub-site' },
            { text: 'Backend', link: '/guide/backend' },
            { text: 'CiRole', link: '/guide/ci-role' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: apiSidebar,
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/samconibear/genesis-cdk' },
    ],
  },
});
