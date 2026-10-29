# Production Deployment Runbook

This runbook targets Ubuntu on a DigitalOcean VPS, Docker Compose, MySQL 8.4, persistent Docker volumes for uploads, Caddy for origin HTTPS, and Cloudflare DNS/proxy. Do not paste credentials into source control, chat, or issue comments.

The configuration is a deployable foundation, not a production deployment by itself. A project owner must provision the VPS, domain, DNS, secrets, backups, and monitoring, and verify the release in that environment.

## 1. Provision the host

1. Provision a supported Ubuntu LTS DigitalOcean Droplet with enough disk for MySQL, uploads, Docker images, and backups.
2. Configure SSH keys and restrict SSH access to the administration network.
3. Install Docker Engine and the Docker Compose plugin from Docker's official Ubuntu instructions.
4. Configure the host firewall to allow SSH only from trusted addresses and inbound TCP 80/443. Do not expose MySQL port 3306 or backend port 8000 publicly.
5. Create a non-root deployment account with access to Docker, and keep the system patched.

## 2. Configure Cloudflare DNS and TLS

1. Add an `A` record for the chosen application hostname pointing to the VPS public IPv4 address. Enable the Cloudflare proxy after DNS resolves.
2. Set Cloudflare SSL/TLS mode to **Full (strict)**. Caddy obtains and renews a publicly trusted certificate at the VPS origin.
3. Ensure Cloudflare can reach origin ports 80 and 443. Do not use Flexible mode.
4. Use a single canonical hostname consistently in `DOMAIN`, `PUBLIC_FRONTEND_URL`, and `PUBLIC_API_BASE_URL`.

## 3. Prepare the deployment environment

On the VPS, clone the reviewed repository and move into the repository directory. Create the private deployment environment file:

```bash
cp .env.production.example .env
chmod 600 .env
```

Edit `.env` on the VPS. Set:

- `DOMAIN` and `ACME_EMAIL`.
- A unique MySQL application password and a different MySQL root password.
- A randomly generated `SECRET_KEY` with at least 32 characters. For example, generate URL-safe values using Python's `secrets.token_urlsafe(48)`.
- `PUBLIC_API_BASE_URL=https://YOUR_HOSTNAME/api/v1` and `PUBLIC_FRONTEND_URL=https://YOUR_HOSTNAME`.

Do not use the example placeholder values. Restrict access to `.env`; keep it out of Git and backups that are not protected. The example uses URL-safe random password guidance because deployment backup commands load `.env` as a shell environment file.

## 4. Build and start services

Validate Compose configuration, build, and start:

```bash
docker compose config -q
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 proxy backend db
```

The stack starts MySQL, initializes ownership on the persistent upload volume, runs the Alembic migration, starts FastAPI, serves the React app through Nginx, and terminates HTTPS at Caddy. Only the proxy publishes host ports. Database and uploaded documents are stored in named Docker volumes.

Create the initial Admin after the API is healthy:

```bash
docker compose exec backend python -m app.create_admin
```

This command prompts for account details. Public registration continues to create Student accounts only.

## 5. Verify the release

From the VPS and a separate client network, verify:

- `https://YOUR_HOSTNAME/` loads the frontend with a valid TLS certificate.
- `https://YOUR_HOSTNAME/health` reports a healthy API/database connection.
- `https://YOUR_HOSTNAME/docs` serves the API documentation.
- Registration creates a Student; login returns a JWT; unauthorized requests are rejected.
- A Student upload appears in the review queue, is not publicly visible before approval, and can be previewed by an authorized reviewer.
- Approval makes a document available, and the QR code opens the frontend verification page.
- Revocation removes the document from public listing/download and the verification page reports Revoked.
- Quiz attempt scores are calculated by the API and persisted.
- `docker compose restart backend` preserves the database and uploaded files.

Run the integration tests in CI or on a controlled host before deployment. The local suite uses SQLite; it is not a substitute for MySQL release checks.

## 6. Backups and restore

The stack's persistent Docker volumes are **not backups**. Back up the database and upload files together, encrypt or otherwise protect archives, copy them off the VPS, and monitor job success.

Run a backup manually:

```bash
bash deployment/backup.sh
```

The script writes a database-plus-upload archive and SHA-256 checksum under `backups/` (ignored by Git). Install a daily cron job under the deployment account, for example:

```cron
15 2 * * * cd /path/to/Library-platform-main && /bin/bash deployment/backup.sh >> /var/log/letlearntogether-backup.log 2>&1
```

Restrict the backup directory to the deployment account, ship encrypted copies off-host, and alert on missed or failed backups. The default local retention is 14 days; set `BACKUP_RETENTION_DAYS` in the deployment shell environment to change it.

At least once before launch and periodically afterward, test a restore into an isolated non-production deployment:

1. Put that deployment into maintenance mode and stop API writes.
2. Verify the selected archive checksum; extract `database.sql` and `uploads.tar.gz` to a restricted temporary directory.
3. Restore the SQL dump into the isolated MySQL database and restore the upload archive into that environment's upload volume.
4. Start the API, verify document metadata/files, login, and quiz history, and record recovery time and any lost-write window.
5. Never test restore steps against the only production database or volume.

## 7. Updates and rollback

1. Review the pull request, CI, schema migration, and recovery plan.
2. Take and verify a pre-deploy backup.
3. Deploy the reviewed revision with `docker compose up --build -d`.
4. Check migration logs, service health, API documentation, frontend routes, and critical user flows.
5. If checks fail, stop promotion and follow the release's documented rollback/forward-fix plan. Do not blindly downgrade a migration or delete a volume.

Schema migrations may not be reversible after data writes. Coordinate rollbacks with the database team and keep previous images available. This guide does not authorize destructive database or volume operations.

## Operational follow-up

Before calling the service production-ready, assign owners for uptime monitoring, security updates, incident response, data retention/privacy policy, backup restoration, capacity alerts, and dependency updates. Conduct target-environment load, accessibility, and security testing; neither this workspace nor CI can verify the actual VPS, DNS, Cloudflare settings, or backup destination.
