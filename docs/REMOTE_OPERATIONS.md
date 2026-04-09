## Exploitation / Paramétrage distant (GCP)

Ce document décrit comment configurer et opérer le projet une fois déployé sur une **VM GCP** (pipeline GitHub Actions → Artifact Registry → SSH).

## Composants

- **Mosquitto** : broker MQTT (ports 1883 TCP, 9001 WebSockets)
- **`ts601-codec`** : service qui décode/encode les messages Milesight TS601 via MQTT

## Variables d’environnement (service `ts601-codec`)

Référence locale : `docker-compose.yml`. En production, le workflow génère `~/mqtt-broker/deploy/docker-compose.prod.yml` et `.env` sur la VM.

- **`MQTT_URL`**: URL du broker MQTT (ex: `mqtt://mosquitto:1883`)
- **`MQTT_USERNAME` / `MQTT_PASSWORD`**: identifiants MQTT (optionnels ; peuvent être fournis via secrets GitHub `MQTT_USERNAME` / `MQTT_PASSWORD`)
- **`UPLINK_SUBSCRIBE`**: topic(s) d’entrée uplink (ex: `ts601/uplink/#`)
- **`DECODED_PUBLISH_PREFIX`**: préfixe de publication du JSON décodé (ex: `ts601/decoded/`)
- **`CMD_SUBSCRIBE`**: topic(s) d’entrée commandes JSON (ex: `ts601/cmd/#`)
- **`DOWNLINK_PUBLISH_PREFIX`**: préfixe de publication des downlinks encodés (ex: `ts601/downlink/`)
- **`CODEC_INPUT_FORMAT`**: `hex|base64|json_bytes`
- **`CODEC_OUTPUT_BYTES_FORMAT`**: `hex|base64|json_bytes`
- **`MILESIGHT_VENDOR_DIR`**: chemin alternatif vers les fichiers Milesight TS601 (optionnel)

## Commandes utiles (local)

### Démarrage

```bash
docker compose up --build -d
```

### Logs

```bash
docker logs mosquitto --tail 200
docker logs ts601-codec --tail 200
```

### Publier / s’abonner sans installer `mosquitto_pub`

Publier un uplink (hex) :

```powershell
docker run --rm --network mqtt-broker_default eclipse-mosquitto:2.0 mosquitto_pub -h mosquitto -t "ts601/uplink/test" -m "0101"
```

Voir le JSON décodé :

```powershell
docker run --rm --network mqtt-broker_default eclipse-mosquitto:2.0 mosquitto_sub -h mosquitto -t "ts601/decoded/#" -v
```

## Opérations sur la VM (production)

Répertoire de déploiement : `~/mqtt-broker/deploy/`.

### Logs

```bash
cd ~/mqtt-broker/deploy
sudo docker compose -f docker-compose.prod.yml --env-file .env logs -f mosquitto
sudo docker compose -f docker-compose.prod.yml --env-file .env logs -f ts601-codec
```

### Redémarrer

```bash
cd ~/mqtt-broker/deploy
sudo docker compose -f docker-compose.prod.yml --env-file .env restart ts601-codec
sudo docker compose -f docker-compose.prod.yml --env-file .env restart mosquitto
```

### Mettre à jour manuellement l’image (sans passer par GitHub)

Après `docker login` sur Artifact Registry :

```bash
cd ~/mqtt-broker/deploy
sudo docker compose -f docker-compose.prod.yml --env-file .env pull ts601-codec
sudo docker compose -f docker-compose.prod.yml --env-file .env up -d
```

## GitHub → GCP (CI/CD)

Secrets et prérequis : `deploy/vm/README.md`.

Workflow : `.github/workflows/deploy-vm.yml` (tests, build/push `ts601-codec`, déploiement SSH).
