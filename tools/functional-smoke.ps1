$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot -Parent)

docker compose build ts601-codec | Out-Null
docker compose up -d mosquitto ts601-codec | Out-Null

try {
  # Start subscriber (1 message) in background
  $subJob = Start-Job -ScriptBlock {
    docker run --rm --network mqtt-broker_default eclipse-mosquitto:2.0 mosquitto_sub -h mosquitto -t "ts601/decoded/#" -C 1 -v
  }

  Start-Sleep -Milliseconds 300

  docker run --rm --network mqtt-broker_default eclipse-mosquitto:2.0 mosquitto_pub -h mosquitto -t "ts601/uplink/test" -m "0101" | Out-Null

  # Hard timeout to avoid hanging
  $out = Wait-Job -Job $subJob -Timeout 20 | Out-Null
  if (-not $out) {
    Stop-Job $subJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $subJob -Force -ErrorAction SilentlyContinue | Out-Null
    throw "Smoke KO: timeout (aucun message reçu sur ts601/decoded/#)"
  }
  $out = Receive-Job -Job $subJob -AutoRemoveJob -ErrorAction Stop

  if ($out -notmatch '"decoded"') { throw "Smoke KO: pas de champ decoded" }
  if ($out -notmatch '"battery":1') { throw "Smoke KO: battery!=1" }

  Write-Host "OK functional smoke"
}
finally {
  docker compose down -v --remove-orphans | Out-Null
}

