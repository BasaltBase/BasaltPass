# BasaltPass beancs-system Deployment

BasaltPass now deploys to the shared `beancs-system` namespace through GitHub Actions.

## Trigger

- Push to `main` or `deploy`: run backend tests and push backend/frontend images to GHCR.
- Push a `beancs-*` tag: deploy backend/frontend to `beancs-system`.

Tags are only accepted when their commit belongs to `origin/deploy`.

## Required GitHub Secrets

- `KUBE_CONFIG`: kubeconfig for the target k3s cluster.
- `PROD_JWT_SECRET`: production JWT signing secret.
- `BASALTPASS_DATABASE_DSN`: production database DSN.

For AWS SES email:

- `BASALTPASS_EMAIL_AWS_SES_REGION`
- `BASALTPASS_EMAIL_AWS_SES_ACCESS_KEY_ID`
- `BASALTPASS_EMAIL_AWS_SES_SECRET_ACCESS_KEY`

Optional:

- `GHCR_PAT`: use when `GITHUB_TOKEN` is not enough for cluster image pulls.

## Required GitHub Variables

- `BASALTPASS_PUBLIC_URL`: public URL used when building the frontend, such as `https://auth.example.com`.
- `BASALTPASS_PUBLIC_HOST`: public host for the Traefik Ingress, such as `auth.example.com`.
- `BASALTPASS_CORS_ALLOW_ORIGINS`: comma-separated allowed origins.

Recommended for email:

- `BASALTPASS_EMAIL_PROVIDER`: for example `aws_ses`.
- `BASALTPASS_EMAIL_FROM`: sender address.

Optional:

- `BASALTPASS_DATABASE_DRIVER`: defaults to `postgres`.

## Release

```bash
git checkout deploy
git pull --ff-only origin deploy
git tag beancs-v1.0.0
git push origin deploy --tags
```

The workflow creates:

- `Secret/basaltpass-env`
- `Deployment/basaltpass-backend`
- `Service/backend`
- `Service/basaltpass-backend`
- `Deployment/basaltpass-frontend`
- `Service/basaltpass-frontend`
- `Ingress/basaltpass-public` when `BASALTPASS_PUBLIC_HOST` is set

Legacy SSH/VPS deployment has been removed.
