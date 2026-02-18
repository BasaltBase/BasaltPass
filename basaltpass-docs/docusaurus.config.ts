import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'BasaltPass',
  tagline: 'Secure, scalable, and isolated multi-tenant authentication.',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://basaltbase.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/BasaltPass/',

  // GitHub pages deployment config.
  organizationName: 'BasaltBase', // Usually your GitHub org/user name.
  projectName: 'BasaltPass', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
    localeConfigs: {
      en: {
        label: 'English',
      },
      'zh-Hans': {
        label: '简体中文',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/BasaltBase/BasaltPass/tree/main/basaltpass-docs/',
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/BasaltBase/BasaltPass/tree/main/basaltpass-docs/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/logo.svg',
    navbar: {
      title: 'BasaltPass',
      logo: {
        alt: 'BasaltPass Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/BasaltBase/BasaltPass',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro/what-is-basaltpass',
            },
            {
              label: 'Integration Guide',
              to: '/docs/integration/oauth2-oidc',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/BasaltBase/BasaltPass',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} BasaltPass. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['powershell', 'bash', 'json', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
