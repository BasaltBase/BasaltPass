import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

import Translate, {translate} from '@docusaurus/Translate';

const FeatureList: FeatureItem[] = [
  {
    title: translate({message: 'Multi-Tenant by Design', id: 'homepage.features.multitenant.title'}),
    icon: '🏢',
    description: (
      <Translate id="homepage.features.multitenant.description">
        Built from the ground up to support multiple tenants with strict data isolation.
        Perfect for SaaS platforms and large enterprises.
      </Translate>
    ),
  },
  {
    title: translate({message: 'Standards Compliant', id: 'homepage.features.standards.title'}),
    icon: '🔐',
    description: (
      <Translate id="homepage.features.standards.description">
        Fully implements OAuth 2.0 and OpenID Connect protocols.
        Compatible with any standard OIDC client library.
      </Translate>
    ),
  },
  {
    title: translate({message: 'Secure & Scalable', id: 'homepage.features.secure.title'}),
    icon: '⚡',
    description: (
      <Translate id="homepage.features.secure.description">
        Features modern security practices like PKCE, RBAC, and Audit Logs.
        Designed to scale with your user base.
      </Translate>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <span style={{fontSize: '5rem'}} role="img" aria-label={title}>
          {icon}
        </span>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
