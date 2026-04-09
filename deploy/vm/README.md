## Déploiement sur VM GCP (SSH + Artifact Registry)

Le workflow **Deploy to GCP VM** (`.github/workflows/deploy-vm.yml`) :

1. Exécute les tests (unitaires + smoke Docker)
2. S’authentifie sur GCP via **Workload Identity Federation**
3. Build et push l’image **`ts601-codec`** vers Artifact Registry (`:sha` et `:latest`)
4. Se connecte en **SSH** à la VM, écrit `~/mqtt-broker/deploy/` (`mosquitto.conf`, `docker-compose.prod.yml`, `.env`), puis `docker compose pull` + `up -d`

### Secrets GitHub (Actions)

| Secret | Description |
|--------|-------------|
| `GCP_WIF_PROVIDER` | Resource name du provider WIF (`projects/.../locations/global/workloadIdentityPools/.../providers/...`) |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Email du compte de service impersonné (ex. `deploy@projet.iam.gserviceaccount.com`) |
| `GCP_PROJECT_ID` | ID du projet GCP |
| `GCP_ARTIFACT_REGION` | Région Artifact Registry (ex. `us-central1`) |
| `GCP_ARTIFACT_REPO` | ID du dépôt Docker dans Artifact Registry (ex. `mqtt-broker`) |
| `VM_HOST` | IP ou hostname de la VM |
| `VM_USER` | Utilisateur SSH |
| `VM_SSH_KEY` | Clé privée SSH (PEM) |
| `VM_SSH_KEY_PASSPHRASE` | Passphrase de la clé (vide si aucune) |

Optionnel :

| Secret | Description |
|--------|-------------|
| `MQTT_USERNAME` | Auth MQTT pour le codec (vide si anonyme) |
| `MQTT_PASSWORD` | Mot de passe MQTT |

### Prérequis GCP

- API **Artifact Registry** activée ; dépôt Docker `GCP_ARTIFACT_REPO` dans `GCP_ARTIFACT_REGION`
- Le compte de service a **Artifact Registry Writer** (push depuis GitHub)
- Binding WIF → SA avec **roles/iam.workloadIdentityUser** (ou équivalent) sur le SA
- La VM a **Docker** et **Docker Compose v2** (`docker compose`), et l’utilisateur peut utiliser `sudo docker`

### Fichiers sur la VM

Répertoire : `~/mqtt-broker/deploy/`

- `mosquitto.conf` — config broker (1883 + WebSockets 9001)
- `docker-compose.prod.yml` — Mosquitto + `ts601-codec`
- `.env` — `IMAGE=...:latest` et variables MQTT optionnelles

### Logs sur la VM

```bash
cd ~/mqtt-broker/deploy
sudo docker compose -f docker-compose.prod.yml logs -f ts601-codec
sudo docker compose -f docker-compose.prod.yml logs -f mosquitto
```
