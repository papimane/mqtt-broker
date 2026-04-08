#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose up -d --build

cleanup() {
  docker compose down -v --remove-orphans || true
}
trap cleanup EXIT

# Subscribe in background (one message)
docker run --rm --network mqtt-broker_default efrecon/mqtt-client sub -h mosquitto -t "ts601/decoded/#" -C 1 -v > /tmp/decoded.out &
sub_pid=$!

# Publish a minimal uplink: "0101" -> battery:1 via codec
docker run --rm --network mqtt-broker_default efrecon/mqtt-client pub -h mosquitto -t "ts601/uplink/test" -m "0101"

set +e
for i in {1..20}; do
  if [ -s /tmp/decoded.out ]; then
    break
  fi
  sleep 0.25
done
set -e

wait "$sub_pid" || true

grep -q '"decoded"' /tmp/decoded.out
grep -q '"battery":1' /tmp/decoded.out

echo "OK functional smoke"

