# Развёртывание в Google Cloud

Весь сайт на одной виртуальной машине Compute Engine: PostgreSQL, Redis, api, collab, runner и
Caddy в Docker Compose (`infra/gcp/docker-compose.yml`). Caddy отдаёт собранный сайт и на том же
адресе проксирует `/api`, `/collab` и `/terminal`, как локальный тестовый хостинг, и сам получает
HTTPS-сертификат. Своего домена не нужно: адрес вида `https://35-228-1-2.sslip.io` строится из IP.

Запуск кода и терминал на публичном сайте требуют кода доступа владельца (`RUN_ACCESS_CODE`).

Роботов мессенджеров Caddy отправляет на страницу предпросмотра в API (`/preview/*`), чтобы у
ссылки-приглашения в чате были заголовок «Имя приглашает вас в проект…» и картинка.

Развёрнуто 5 ноября 2026 года: **https://35-228-155-63.sslip.io**, проект
`project-d64af781-2588-4bb2-a48`.

## Что создаётся

| Ресурс | Параметры |
|---|---|
| VM `collab` | e2-medium (2 vCPU, 4 ГБ), Debian 12, диск 30 ГБ pd-balanced, зона `europe-north1-a` (Финляндия, ЕС) |
| Статический IP `collab-ip` | чтобы адрес сайта не менялся после перезапуска |
| Правило файрвола `collab-web` | входящие TCP 80, 443 и UDP 443 для машин с тегом `collab-web` |

## Один раз: проект и машина

```bash
gcloud auth login
gcloud projects create <id-проекта> --name="Collab diploma"
gcloud billing projects link <id-проекта> --billing-account=<id-платёжного-аккаунта>
gcloud config set project <id-проекта>
gcloud services enable compute.googleapis.com
gcloud compute addresses create collab-ip --region=europe-north1
gcloud compute firewall-rules create collab-web --allow=tcp:80,tcp:443,udp:443 --target-tags=collab-web
gcloud compute instances create collab --zone=europe-north1-a --machine-type=e2-medium \
  --image-family=debian-12 --image-project=debian-cloud --boot-disk-size=30GB --boot-disk-type=pd-balanced \
  --address=collab-ip --tags=collab-web --metadata-from-file=startup-script=infra/gcp/vm-setup.sh
```

`infra/gcp/vm-setup.sh` ставит Docker, добавляет 2 ГБ подкачки и загружает образы песочниц.

## Каждое обновление

```bash
node infra/gcp/deploy.mjs
```

На Windows запускайте из PowerShell или cmd: в Git Bash `gcloud compute ssh` не находит ключ
(скрипт это обходит, но ручные команды `gcloud compute ssh` из Git Bash падают с «Не удаётся
найти указанный путь»).

Скрипт собирает сайт на этом компьютере, упаковывает закоммиченный код (`git archive HEAD`),
копирует оба архива на машину и запускает там `infra/gcp/remote-deploy.sh`: сборка образов,
миграции, перезапуск. При первом запуске на машине создаётся `/opt/collab/.env` со случайными
паролем базы, ключами JWT и кодом доступа. Код доступа скрипт сохраняет в
`infra/gcp/.state/run-access-code.txt` (вне git).

## Обслуживание

```bash
gcloud compute ssh collab --zone=europe-north1-a
cd /opt/collab/src && sudo docker compose -f infra/gcp/docker-compose.yml logs -f api
```

Остановить машину, чтобы не тратить кредит (адрес сохранится, диск и IP оплачиваются дальше):

```bash
gcloud compute instances stop collab --zone=europe-north1-a
```
