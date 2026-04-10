$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot -Parent)

function Remove-ContainerIfExists([string] $Name) {
  try {
    docker rm -f $Name 2>$null | Out-Null
  }
  catch {
    # Si le conteneur n'existe pas, docker renvoie une erreur: on l'ignore.
  }
}

docker compose build ts601-codec | Out-Null
docker compose up -d mosquitto ts601-codec | Out-Null

try {
  # Wait codec readiness (avoid publish before subscribe)
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    $logs = docker compose logs --no-color --tail 50 ts601-codec 2>$null
    # Évite les soucis d'encodage/accents dans la sortie logs
    if ($logs -match "Subscriptions actives") { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) {
    docker compose logs --no-color --tail 200 ts601-codec | Out-Host
    throw "Smoke KO: ts601-codec pas prêt (pas de log de connexion)"
  }

  # Start subscriber (1 message) as a detached container (évite Start-Job/threads PowerShell)
  $subName = "mqtt-broker-smoke-sub"
  Remove-ContainerIfExists $subName
  docker run -d --name $subName --network mqtt-broker_default eclipse-mosquitto:2.0 `
    sh -lc "mosquitto_sub -h mosquitto -t 'decoded/ts/+/uplink' -C 1 -v" | Out-Null

  # Attendre que l'abonnement soit visible côté broker (évite la course)
  $subReady = $false
  for ($i = 0; $i -lt 40; $i++) {
    $mlogs = docker compose logs --no-color --tail 300 mosquitto 2>$null
    # Utilise -like pour éviter les soucis d'encodage/regex
    if ($mlogs -like "*decoded/ts/+/uplink*") { $subReady = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $subReady) {
    docker compose logs --no-color --tail 300 mosquitto | Out-Host
    docker logs $subName 2>$null | Out-Host
    Remove-ContainerIfExists $subName
    throw "Smoke KO: subscriber pas prêt (pas de SUBSCRIBE decoded/ts/+/uplink vu côté broker)"
  }

  # Publish a minimal uplink en binaire (enveloppe JSON).
  # Payload = deux octets 0x01 0x01 -> battery: 1 via codec.
  docker run --rm --network mqtt-broker_default eclipse-mosquitto:2.0 mosquitto_pub -h mosquitto -t "ts/ABC123/uplink" -m '{"topic":"ts/ABC123/uplink","payload":"\u0001\u0001"}' | Out-Null

  # Hard timeout to avoid hanging: éviter de spammer `docker logs` (peut être lourd en mémoire).
  # On attend que le conteneur subscriber EXIT (il sort dès qu'il a reçu 1 message -C 1).
  $out = $null
  $done = $false
  for ($i = 0; $i -lt 80; $i++) { # 80 * 250ms = 20s
    $status = docker inspect -f "{{.State.Status}}" $subName 2>$null
    if ($status -eq "exited") { $done = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if ($done) {
    $out = docker logs $subName 2>$null
  }
  Remove-ContainerIfExists $subName

  if (-not $out) {
    docker compose logs --no-color --tail 200 ts601-codec | Out-Host
    docker compose logs --no-color --tail 200 mosquitto | Out-Host
    throw "Smoke KO: timeout (aucun message reçu sur decoded/ts/+/uplink)"
  }

  if ($out -notmatch '"decoded"') { throw "Smoke KO: pas de champ decoded" }
  if ($out -notmatch '"uplink_wrapper":"json_envelope"') { throw "Smoke KO: uplink_wrapper!=json_envelope" }
  if ($out -notmatch '"battery":1') { throw "Smoke KO: battery!=1" }

  Write-Host "OK functional smoke"
}
finally {
  docker compose down -v --remove-orphans | Out-Null
}

