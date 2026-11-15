# Deployment on AWS

The implementation of [ADR-004](adr/004-deploy-aws.md): one EC2 machine with Docker Compose (api,
collab, runner, Redis, Caddy), PostgreSQL in RDS, the front end in S3 behind CloudFront.

> **Status.** The Docker images, `docker-compose.yml` and the scripts follow the same recipes that work
> locally and on Google Cloud, but **this guide has not been run on a real AWS account**: I had no
> access to AWS during development. Run it once from start to end and fix whatever differs from
> reality; check current prices and free tier terms first.

## 1. Database (RDS)

1. RDS → Create database → PostgreSQL 16, template Free tier / `db.t4g.micro`.
2. Database name `collab`, user `collab`, a generated password.
3. Public access: **No**. The security group `collab-db` allows port 5432 only from the security group
   `collab-ec2` (see below).

## 2. Server (EC2)

1. EC2 → Launch instance: Ubuntu 24.04, `t3.small` (2 GB RAM; building images on a `t3.micro` is
   tight), 20 GB disk. Security group `collab-ec2`: incoming 22 (only your IP), 80 and 443 (everyone).
2. Elastic IP: attach it to the instance so the address does not change.
3. Install Docker and clone the repository:

   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER && newgrp docker
   git clone <repository-url> ~/collab-code-platform
   ```

4. DNS: two A records (`api.…` and `collab.…`) pointing to the Elastic IP. Without your own domain,
   [sslip.io](https://sslip.io) works: for the IP `203.0.113.10` the names `api.203-0-113-10.sslip.io`
   and `collab.203-0-113-10.sslip.io` already resolve, and Caddy will get certificates for them.
5. Configuration:

   ```bash
   cd ~/collab-code-platform
   cp infra/.env.prod.example infra/.env
   nano infra/.env      # domains, DATABASE_URL (RDS), JWT secrets, CORS_ORIGIN
   ```

6. First start: `./infra/deploy.sh` (pulls the sandbox images, builds the services, applies the
   migrations, starts the stack).

The runner gets access to the host's Docker socket to start sandboxes. This is a conscious trade-off of
ADR-004: if the runner is compromised, that means access to Docker on this host. So the machine runs
nothing but the stack itself, and user code runs only in containers with the limits from
[ADR-003](adr/003-code-execution-docker-queue.md).

## 3. Front end (S3 + CloudFront)

1. S3: a bucket without public access (Block all public access is on).
2. CloudFront: the origin is the bucket through Origin Access Control; default root object
   `index.html`; custom error responses 403 and 404 → `/index.html` with code 200 (otherwise direct
   links like `/join/…` return an error).
3. Put the CloudFront distribution address (`https://dxxxx.cloudfront.net`) into `CORS_ORIGIN` on the
   server.
4. Build and upload (the workflow below does the same):

   ```bash
   VITE_API_URL=https://api.<domain> VITE_COLLAB_URL=wss://collab.<domain> \
     pnpm --filter @collab/web build
   aws s3 sync apps/web/dist s3://<bucket> --delete
   aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
   ```

## 4. Automatic deployment (GitHub Actions)

The workflow `.github/workflows/deploy.yml` is started by hand (Actions → Deploy → Run workflow).
Repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`,
`CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_URL`, `VITE_COLLAB_URL`, `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`.
The IAM user needs only `s3:PutObject/DeleteObject/ListBucket` on the bucket and
`cloudfront:CreateInvalidation`.

## 5. Check after deploying

```bash
curl https://api.<domain>/health          # {"status":"ok"}
docker compose -f infra/docker-compose.yml --env-file infra/.env ps
```

Then in the browser: open the CloudFront address, join as a guest, create a project and a file, open the
invite link in a second window, and check that edits and the chat sync and that Run shows output.

## How to grow

When the load grows, the services move to ECS with an ALB (api and collab on Fargate), and the runner
stays on EC2 with a Docker daemon; see the comparison in ADR-004. With several api instances, the project
events (`/ws`) have to move from the in-memory hub to Redis pub/sub.
