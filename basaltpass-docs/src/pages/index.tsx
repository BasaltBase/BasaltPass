import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import Translate from '@docusaurus/Translate';

import styles from './index.module.css';

type QuickLink = {
  title: ReactNode;
  description: ReactNode;
  to: string;
};

type AudienceLink = {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  to: string;
};

type CapabilityItem = {
  label: ReactNode;
  value: ReactNode;
};

const capabilities: CapabilityItem[] = [
  {
    label: <Translate id="homepage.capabilities.oidc.label">Identity</Translate>,
    value: <Translate id="homepage.capabilities.oidc.value">OAuth2, OIDC, PKCE</Translate>,
  },
  {
    label: <Translate id="homepage.capabilities.multitenant.label">Isolation</Translate>,
    value: <Translate id="homepage.capabilities.multitenant.value">Tenant-aware users, apps, and RBAC</Translate>,
  },
  {
    label: <Translate id="homepage.capabilities.s2s.label">Automation</Translate>,
    value: <Translate id="homepage.capabilities.s2s.value">S2S APIs for wallet, teams, notifications, and email</Translate>,
  },
];

const audienceLinks: AudienceLink[] = [
  {
    eyebrow: <Translate id="homepage.audience.app.eyebrow">App Developer</Translate>,
    title: <Translate id="homepage.audience.app.title">Integrate login, tokens, and app-to-app workflows</Translate>,
    description: (
      <Translate id="homepage.audience.app.description">
        Start with OAuth2/OIDC integration, then move into S2S APIs for user data, wallet access, team workflows, and app-triggered messaging.
      </Translate>
    ),
    to: '/docs/integration/overview',
  },
  {
    eyebrow: <Translate id="homepage.audience.tenant.eyebrow">Tenant Admin</Translate>,
    title: <Translate id="homepage.audience.tenant.title">Operate apps, users, permissions, and tenant content</Translate>,
    description: (
      <Translate id="homepage.audience.tenant.description">
        Use tenant-oriented docs when you are configuring apps, managing user access, organizing teams, and running tenant-level operations.
      </Translate>
    ),
    to: '/docs/user-guide/tenant-overview',
  },
  {
    eyebrow: <Translate id="homepage.audience.platform.eyebrow">Platform Admin</Translate>,
    title: <Translate id="homepage.audience.platform.title">Run the platform, inspect architecture, and control system behavior</Translate>,
    description: (
      <Translate id="homepage.audience.platform.description">
        Jump into reference and project docs for deployment, route maps, data model details, and platform-wide governance.
      </Translate>
    ),
    to: '/docs/reference/backend-architecture',
  },
];

const quickLinks: QuickLink[] = [
  {
    title: <Translate id="homepage.quicklinks.getStarted.title">Get Started</Translate>,
    description: (
      <Translate id="homepage.quicklinks.getStarted.description">
        Product overview, architecture, and the fastest way to get BasaltPass running locally.
      </Translate>
    ),
    to: '/docs/intro/what-is-basaltpass',
  },
  {
    title: <Translate id="homepage.quicklinks.integration.title">Integration</Translate>,
    description: (
      <Translate id="homepage.quicklinks.integration.description">
        OAuth2, OIDC, PKCE, client registration, token validation, and integration troubleshooting.
      </Translate>
    ),
    to: '/docs/integration/overview',
  },
  {
    title: <Translate id="homepage.quicklinks.s2s.title">S2S API</Translate>,
    description: (
      <Translate id="homepage.quicklinks.s2s.description">
        Server-to-server APIs for user lookup, RBAC, wallets, teams, notifications, and app email.
      </Translate>
    ),
    to: '/docs/reference/s2s-api',
  },
  {
    title: <Translate id="homepage.quicklinks.reference.title">Reference</Translate>,
    description: (
      <Translate id="homepage.quicklinks.reference.description">
        API conventions, data model, repo structure, and architecture reference for deeper work.
      </Translate>
    ),
    to: '/docs/reference/api-conventions',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroLayout}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>
              <Translate id="homepage.eyebrow">Product Documentation</Translate>
            </p>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>
              <Translate id="homepage.tagline">
                Secure, scalable, and isolated multi-tenant authentication.
              </Translate>
            </p>
            <div className={styles.buttons}>
              <Link className="button button--secondary button--lg" to="/docs/intro/what-is-basaltpass">
                <Translate id="homepage.getStarted">Get Started - 5min ⏱️</Translate>
              </Link>
              <Link className="button button--outline button--secondary button--lg" to="/docs/reference/s2s-api">
                <Translate id="homepage.s2sApi">Open S2S API</Translate>
              </Link>
            </div>
          </div>
          <div className={styles.heroPanel}>
            <p className={styles.heroPanelTitle}>
              <Translate id="homepage.capabilities.heading">What BasaltPass already covers</Translate>
            </p>
            <div className={styles.capabilityList}>
              {capabilities.map((item, idx) => (
                <div key={idx} className={styles.capabilityItem}>
                  <span className={styles.capabilityLabel}>{item.label}</span>
                  <span className={styles.capabilityValue}>{item.value}</span>
                </div>
              ))}
            </div>
            <Link className={styles.heroPanelLink} to="/docs/reference/repo-structure">
              <Translate id="homepage.capabilities.link">Explore platform reference</Translate>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function AudienceSection() {
  return (
    <section className={styles.audienceSection}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">
            <Translate id="homepage.audience.heading">Choose Your Path</Translate>
          </Heading>
          <p>
            <Translate id="homepage.audience.subheading">
              BasaltPass serves different kinds of builders. Start from the role that matches your work.
            </Translate>
          </p>
        </div>
        <div className={styles.audienceGrid}>
          {audienceLinks.map((item, idx) => (
            <Link key={idx} className={styles.audienceCard} to={item.to}>
              <span className={styles.audienceEyebrow}>{item.eyebrow}</span>
              <Heading as="h3">{item.title}</Heading>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickLinksSection() {
  return (
    <section className={styles.quickLinksSection}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">
            <Translate id="homepage.quicklinks.heading">Start Here</Translate>
          </Heading>
          <p>
            <Translate id="homepage.quicklinks.subheading">
              Pick the path that matches what you are trying to do.
            </Translate>
          </p>
        </div>
        <div className={styles.quickLinksGrid}>
          {quickLinks.map((item, idx) => (
            <Link key={idx} className={styles.quickLinkCard} to={item.to}>
              <Heading as="h3">{item.title}</Heading>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} Documentation`}
      description="Official BasaltPass documentation for setup, integration, S2S APIs, and platform reference.">
      <HomepageHeader />
      <main>
        <AudienceSection />
        <QuickLinksSection />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
