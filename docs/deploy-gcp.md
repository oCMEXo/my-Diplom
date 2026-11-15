# Deployment on Google Cloud

The whole site runs on one Compute Engine virtual machine: PostgreSQL, Redis, api, collab, runner and
Caddy in Docker Compose (`infra/gcp/docker-compose.yml`). Caddy serves the built site and, on the same
address, proxies `/api`, `/collab` and `/terminal`, like the local test hosting, and gets the HTTPS
certificate by itself. No own domain is needed: an address like `https://35-228-1-2.sslip.io` is built
from the IP.

Running code and the terminal on the public site need the owner's access code (`RUN_ACCESS_CODE`).

Caddy sends messenger bots to the preview page in the API (`/preview/*`), so an invite link in a chat
shows the title "Name invites you to the project…" and a picture.

Deployed on 5 November 2026: **https://35-228-155-63.sslip.io**, project
`project-d64af781-2588-4bb2-a48`.

## What gets created

| Resource | Settings |
|---|---|
| VM `collab` | e2-medium (2 vCPU, 4 GB), Debian 12, 30 GB pd-balanced disk, zone `europe-north1-a` (Finland, EU) |
| Static IP `collab-ip` | so the site address does not change after a restart |
| Firewall rule `collab-web` | incoming TCP 80, 443 and UDP 443 for machines tagged `collab-web` |

## Once: project and machine

```bash
gcloud auth login
gcloud projects create <project-id> --name="Collab diploma"
gcloud billing projects link <project-id> --billing-account=<billing-account-id>
gcloud config set project <project-id>
gcloud services enable compute.googleapis.com
gcloud compute addresses create collab-ip --region=europe-north1
gcloud compute firewall-rules create collab-web --allow=tcp:80,tcp:443,udp:443 --target-tags=collab-web
gcloud compute instances create collab --zone=europe-north1-a --machine-type=e2-medium \
  --image-family=debian-12 --image-project=debian-cloud --boot-disk-size=30GB --boot-disk-type=pd-balanced \
  --address=collab-ip --tags=collab-web --metadata-from-file=startup-script=infra/gcp/vm-setup.sh
```

`infra/gcp/vm-setup.sh` installs Docker, adds 2 GB of swap and pulls the sandbox images.

## Every update

```bash
node infra/gcp/deploy.mjs
```

On Windows, run it from PowerShell or cmd: in Git Bash `gcloud compute ssh` cannot find its key (the
script works around it, but manual `gcloud compute ssh` commands from Git Bash fail with "The system
cannot find the path specified").

The script builds the site on this computer, packs the committed code (`git archive HEAD`), copies both
archives to the machine and runs `infra/gcp/remote-deploy.sh` there: building the images, migrations,
restart. On the first run the machine gets `/opt/collab/.env` with a random database password, JWT keys
and an access code. The script saves the access code in `infra/gcp/.state/run-access-code.txt` (outside
git).

## Maintenance

```bash
gcloud compute ssh collab --zone=europe-north1-a
cd /opt/collab/src && sudo docker compose -f infra/gcp/docker-compose.yml logs -f api
```

To stop the machine and save credit (the address stays; the disk and IP are still billed):

```bash
gcloud compute instances stop collab --zone=europe-north1-a
```
