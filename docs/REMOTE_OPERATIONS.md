## Exploitation / Paramétrage distant (GCP)

Ce document décrit comment configurer et opérer le projet une fois déployé sur GCP.

## Composants

- **Mosquitto** : broker MQTT (ports 1883 TCP, 9001 WebSockets en local)
- **`ts601-codec`** : service qui décode/encode les messages Milesight TS601 via MQTT

## Variables d’environnement (service `ts601-codec`)

Ces variables sont déjà déclarées dans `docker-compose.yml` et `deploy/gke/ts601-codec.deployment.yaml`.

- **`MQTT_URL`**: URL du broker MQTT (ex: `mqtt://mosquitto:1883`)
- **`MQTT_USERNAME` / `MQTT_PASSWORD`**: identifiants MQTT (optionnels)
- **`UPLINK_SUBSCRIBE`**: topic(s) d’entrée uplink (ex: `ts601/uplink/#`)
- **`DECODED_PUBLISH_PREFIX`**: préfixe de publication du JSON décodé (ex: `ts601/decoded/`)
- **`CMD_SUBSCRIBE`**: topic(s) d’entrée commandes JSON (ex: `ts601/cmd/#`)
- **`DOWNLINK_PUBLISH_PREFIX`**: préfixe de publication des downlinks encodés (ex: `ts601/downlink/`)
- **`CODEC_INPUT_FORMAT`**: `hex|base64|json_bytes` (format des uplinks reçus)
- **`CODEC_OUTPUT_BYTES_FORMAT`**: `hex|base64|json_bytes` (format des bytes encodés publiés)
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
docker logs mqtt-ui --tail 200
```

### Publier / s’abonner sans installer `mosquitto_pub`

Publier un uplink (hex) :

```powershell
docker run --rm --network mqtt-broker_default efrecon/mqtt-client pub -h mosquitto -t "ts601/uplink/test" -m "0101"
```

Voir le JSON décodé :

```powershell
docker run --rm --network mqtt-broker_default efrecon/mqtt-client sub -h mosquitto -t "ts601/decoded/#" -v
```

## Opérations sur GKE

> Les manifests sont dans `deploy/gke/`.

### Déployer / mettre à jour

```bash
kubectl apply -f deploy/gke/namespace.yaml
kubectl apply -f deploy/gke/mosquitto.configmap.yaml
kubectl apply -f deploy/gke/mosquitto.deployment.yaml
kubectl apply -f deploy/gke/mosquitto.service.yaml
kubectl apply -f deploy/gke/ts601-codec.deployment.yaml
```

### Récupérer l’IP du broker MQTT (LoadBalancer)

```bash
kubectl -n mqtt get svc mosquitto
```

### Logs (GKE)

Mosquitto :

```bash
kubectl -n mqtt logs deployment/mosquitto --tail=200
```

Codec :

```bash
kubectl -n mqtt logs deployment/ts601-codec --tail=200
```

### Redémarrer un composant

```bash
kubectl -n mqtt rollout restart deployment/mosquitto
kubectl -n mqtt rollout restart deployment/ts601-codec
```

### Modifier les variables d’environnement (sans éditer le YAML)

Exemple (changer `CODEC_INPUT_FORMAT`) :

```bash
kubectl -n mqtt set env deployment/ts601-codec CODEC_INPUT_FORMAT=hex
kubectl -n mqtt rollout status deployment/ts601-codec
```

## GitHub → GCP (CI/CD)

La doc de paramétrage GitHub Actions est dans `deploy/gke/GITHUB_TO_GCP.md`.

