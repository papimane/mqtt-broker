$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot -Parent)

docker compose up -d --build | Out-Null

try {
  # Start subscriber (1 message) in background
  $subJob = Start-Job -ScriptBlock {
    docker run --rm --network mqtt-broker_default efrecon/mqtt-client sub -h mosquitto -t "ts601/decoded/#" -C 1 -v
  }

  Start-Sleep -Milliseconds 300

  docker run --rm --network mqtt-broker_default efrecon/mqtt-client pub -h mosquitto -t "ts601/uplink/test" -m "0101" | Out-Null

  $out = Receive-Job -Job $subJob -Wait -AutoRemoveJob -ErrorAction Stop

  if ($out -notmatch '"decoded"') { throw "Smoke KO: pas de champ decoded" }
  if ($out -notmatch '"battery":1') { throw "Smoke KO: battery!=1" }

  Write-Host "OK functional smoke"
}
finally {
  docker compose down -v --remove-orphans | Out-Null
}

