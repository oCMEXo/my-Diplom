# Brings the local databases back after a restart of the computer: pnpm docker:restart
#
# Docker Desktop can stop with "The file cannot be accessed by the system" on its socket files, which an
# unclean shutdown leaves behind and Windows itself cannot delete. They are empty and Docker recreates them.
# This never touches containers' data; "Reset to factory defaults" in Docker's error window would.

$composeFile = Join-Path $PSScriptRoot "docker-compose.dev.yml"
$names = 'Docker Desktop', 'com.docker.backend', 'docker-ai', 'com.docker.build', 'docker-agent', 'docker-secrets-engine'

Write-Host "Stopping Docker Desktop..."
Get-Process -Name $names -ErrorAction SilentlyContinue | Stop-Process -Force -Confirm:$false -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Inside Docker's own Linux distribution the Windows drive C: is /mnt/host/c.
$drive = $env:LOCALAPPDATA.Substring(0, 1).ToLower()
$local = "/mnt/host/$drive" + ($env:LOCALAPPDATA.Substring(2) -replace '\\', '/')

Write-Host "Removing the leftover socket files..."
wsl -d docker-desktop -e sh -c "rm -f $local/Docker/run/dockerInference $local/Docker/run/userAnalyticsOtlpHttp.sock $local/docker-secrets-engine/engine.sock"
wsl --shutdown
Start-Sleep -Seconds 2

Write-Host "Starting Docker Desktop..."
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

$deadline = (Get-Date).AddMinutes(5)
do {
  Start-Sleep -Seconds 5
  docker info *> $null
  $ready = $LASTEXITCODE -eq 0
} until ($ready -or (Get-Date) -gt $deadline)

if (-not $ready) {
  Write-Host "Docker did not answer within 5 minutes. Do not press 'Reset to factory defaults'."
  exit 1
}

Write-Host "Docker is ready, starting PostgreSQL and Redis..."
docker compose -f $composeFile up -d --wait
exit $LASTEXITCODE
