#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose build ts601-codec
docker compose up -d mosquitto ts601-codec

cleanup() {
  docker compose down -v --remove-orphans || true
}
trap cleanup EXIT

# Wait for codec to be connected/subscribed (avoid race)
set +e
ready=0
for i in {1..40}; do
  docker compose logs --no-color --tail 50 ts601-codec | grep -q "Connecté. Subscriptions actives" && ready=1 && break
  sleep 0.5
done
set -e
if [ "$ready" -ne 1 ]; then
  echo "Smoke KO: ts601-codec pas prêt (pas de log de connexion)"
  docker compose logs --no-color --tail 200 ts601-codec || true
  exit 1
fi

# Subscribe (1 message) with hard timeout (avoid hanging CI)
rm -f /tmp/decoded.out
docker run --rm --network mqtt-broker_default eclipse-mosquitto:2.0 \
  sh -lc "timeout 20 mosquitto_sub -h mosquitto -t 'ts601/decoded/#' -C 1 -v" > /tmp/decoded.out &
sub_pid=$!

# Publish a minimal uplink: "0101" -> battery:1 via codec
docker run --rm --network mqtt-broker_default eclipse-mosquitto:2.0 \
  mosquitto_pub -h mosquitto -t "ts601/uplink/test" -m "0101"

set +e
for i in {1..20}; do
  if [ -s /tmp/decoded.out ]; then
    break
  fi
  sleep 0.25
done
set -e

wait "$sub_pid" || true

if [ ! -s /tmp/decoded.out ]; then
  echo "Smoke KO: aucun message reçu sur ts601/decoded/#"
  echo "--- ts601-codec logs ---"
  docker compose logs --no-color --tail 200 ts601-codec || true
  echo "--- mosquitto logs ---"
  docker compose logs --no-color --tail 200 mosquitto || true
  exit 1
fi

grep -q '"decoded"' /tmp/decoded.out
grep -q '"battery":1' /tmp/decoded.out

echo "OK functional smoke"

