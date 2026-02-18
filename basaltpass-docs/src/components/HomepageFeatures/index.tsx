import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Multi-Tenant by Design',
    icon: '🏢',
    description: (
      <>
        Built from the ground up to support multiple tenants with strict data isolation.
        Perfect for SaaS platforms and large enterprises.
      </>
    ),
  },
  {
    title: 'Standards Compliant',
    icon: '🔐',
    description: (
      <>
        Fully implements <code>OAuth 2.0</code> and <code>OpenID Connect</code> protocols.
        Compatible with any standard OIDC client library.
      </>
    ),
  },
  {
    title: 'Secure & Scalable',
    icon: '⚡',
    description: (
      <>
        Features modern security practices like <code>PKCE</code>, RBAC, and Audit Logs.
        Designed to scale with your user base.
      </>
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
