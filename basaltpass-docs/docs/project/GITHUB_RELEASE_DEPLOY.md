# BasaltPassDev -> BasaltPass Release & Deployment Pipeline

This document corresponds to two GitHub Actions added in the repository:

- `release-vX.Y.Z` tag: Syncs a snapshot of the current code to the public repository
- `deploy-prod-vX.Y.Z` tag: Builds images and deploys to your Docker server

## Recommended Repository Structure

- `BasaltPassDev`: Your main development repository — continuous development, PRs, and tags
- `BasaltPass`: Public-facing repository — only receives confirmed release versions

Benefits:

- Daily development is not directly exposed to the public repository
- The public repository history stays cleaner
- Only release versions are synced out

## One-Time GitHub Configuration

### 1. Rename the Current Development Repository

Rename the current repository to `BasaltPassDev`.

Then create a new public repository, e.g.:

- `your-org/BasaltPass`

It is recommended to initialize the public repository with a `README` to ensure the default branch exists from the start.

### 2. Configure Repository Variables in `BasaltPassDev`

In GitHub repository Settings -> Secrets and variables -> Actions -> Variables:

- `PUBLIC_REPO`: Public repository name, e.g., `your-org/BasaltPass`
- `PUBLIC_REPO_BRANCH`: Public repository default branch, usually `main`
- `DEPLOY_HOST`: Docker server IP or domain
- `DEPLOY_PORT`: SSH port, default `22`
- `DEPLOY_USER`: SSH login username
- `DEPLOY_PATH`: Server deployment directory, e.g., `/opt/basaltpass`
- `GHCR_NAMESPACE`: Image namespace, usually your GitHub username or organization name

### 3. Configure Repository Secrets in `BasaltPassDev`

In GitHub repository Settings -> Secrets and variables -> Actions -> Secrets:

- `PUBLIC_REPO_PUSH_TOKEN`: GitHub PAT with write access to the public repository
- `DEPLOY_SSH_PRIVATE_KEY`: Private key for SSH login to the Docker server
- `DEPLOY_GHCR_USERNAME`: Username for pulling GHCR images on the server
- `DEPLOY_GHCR_TOKEN`: Token for pulling GHCR images on the server

Permissions recommendations:

- `PUBLIC_REPO_PUSH_TOKEN`: Requires at least `contents:write` on the target public repository
- `DEPLOY_GHCR_TOKEN`: Requires at least `read:packages` on GHCR

## One-Time Server Preparation

On the Docker server, run:

```bash
sudo mkdir -p /opt/basaltpass
cd /opt/basaltpass
cp /path/to/deploy/.env.prod.example .env
```

Then edit `.env` with your actual production environment variables.

Server prerequisites:

- Docker
- Docker Compose Plugin

## Tag Conventions

### Release to Public Repository

Use the following tag:

```bash
git tag release-v0.1.0
git push origin release-v0.1.0
```

This will trigger:

1. Pull the current `BasaltPassDev` code
2. Filter files according to `.release-sync-ignore`
3. Overwrite-sync to `BasaltPass`
4. Create tag `v0.1.0` on the public repository

### Deploy to Docker Server

Use the following tag:

```bash
git tag deploy-prod-v0.1.0
git push origin deploy-prod-v0.1.0
```

This will trigger:

1. Build the backend image `ghcr.io/<namespace>/basaltpass-backend:0.1.0`
2. Build the frontend image `ghcr.io/<namespace>/basaltpass-frontend:0.1.0`
3. Push to GHCR
4. SSH into your Docker server
5. Run `docker compose pull && docker compose up -d --remove-orphans`
6. Poll `http://127.0.0.1:5104/health` for up to ~6 minutes; transient `502` responses during startup are retried, and the workflow only reports failure after timeout (outputting container status and logs)

## Public Release Filter Rules

`.release-sync-ignore` controls which files should not enter the public repository.

You should review whether to exclude:

- Private documentation
- Internal scripts
- Dev-only configuration
- Server-specific deployment information

## Notes

- The public sync now uses a "snapshot sync" approach, which does not expose `BasaltPassDev` private commit history to the public repository
- The current deployment workflow pulls `deploy/docker-compose.prod.yml` by default
- Production environment variables on the server are stored at `${DEPLOY_PATH}/.env`
- If you later need separate staging and production environments, consider adding a `deploy-staging-vX.Y.Z` workflow
