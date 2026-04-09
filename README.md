## Objectif

Projet dockerisé (déployable sur GCP) fournissant :

- **Un broker MQTT** (Eclipse Mosquitto)
- **Un service “codec” TS601** (Milesight) qui :
  - s’abonne aux uplinks, **décode** la payload binaire TS601 en JSON
  - s’abonne aux commandes JSON, **encode** en bytes TS601 pour downlink

Le codec est basé sur les fichiers officiels Milesight du dépôt `Milesight-IoT/SensorDecoders` (licence GPL-3.0).

## Démarrage local (Docker Compose)

Pré-requis : Docker.

```bash
docker compose up --build
```

Broker MQTT :
- `localhost:1883`
- WebSockets : `ws://localhost:9001/`

UI d’administration (MQTTX Web) :
- `http://localhost:8080`

## Topics (par défaut)

- **Uplink brut → décodé**
  - Entrée (abonnement codec) : `ts601/uplink/#`
  - Sortie (publication codec) : `ts601/decoded/<topic_original>`

- **Commande JSON → downlink encodé**
  - Entrée (abonnement codec) : `ts601/cmd/#`
  - Sortie (publication codec) : `ts601/downlink/<topic_original>`

## Formats de payload supportés

Pour les uplinks (`ts601/uplink/#`), le service accepte :
- **hex** (par défaut) : payload MQTT = chaîne hex (ex: `010364...`)
- **base64** : payload MQTT = base64
- **json_bytes** : payload MQTT = JSON `{"bytes":[1,2,3]}`

Configure via `CODEC_INPUT_FORMAT`.

Pour les commandes (`ts601/cmd/#`), la payload MQTT est **JSON** (objet) conforme aux champs attendus par l’encodeur Milesight TS601.

## Variables d’environnement (codec)

Voir `docker-compose.yml` pour les valeurs par défaut.

- `MQTT_URL` (ex: `mqtt://mosquitto:1883`)
- `MQTT_USERNAME`, `MQTT_PASSWORD` (optionnels)
- `UPLINK_SUBSCRIBE` (ex: `ts601/uplink/#`)
- `DECODED_PUBLISH_PREFIX` (ex: `ts601/decoded/`)
- `CMD_SUBSCRIBE` (ex: `ts601/cmd/#`)
- `DOWNLINK_PUBLISH_PREFIX` (ex: `ts601/downlink/`)
- `CODEC_INPUT_FORMAT` = `hex|base64|json_bytes`
- `CODEC_OUTPUT_BYTES_FORMAT` = `hex|base64|json_bytes` (format des bytes encodés en sortie)

## Déploiement sur GCP

Déploiement prévu sur une **VM Compute Engine** : build/push de l’image `ts601-codec` vers **Artifact Registry**, puis mise à jour via **SSH** et `docker compose` (voir `.github/workflows/deploy-vm.yml`).

Documentation des secrets et du répertoire sur la VM : `deploy/vm/README.md`.

Pour l’exploitation (variables, commandes, logs), voir `docs/REMOTE_OPERATIONS.md`.

