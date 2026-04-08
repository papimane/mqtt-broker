## Mise en ligne sur GCP via GitHub Actions (GKE)

Ce projet déploie :
- Mosquitto (Service `LoadBalancer` TCP 1883)
- `ts601-codec` (image Docker buildée/pushée depuis GitHub)

### 1) Pré-requis GCP

- Un projet GCP
- Un cluster GKE (ex: `mqtt-broker`)
- Artifact Registry (Docker) dans la région (ex: `europe-west1`) avec un repo (ex: `mqtt-broker`)

### 2) Auth GitHub → GCP (recommandé : Workload Identity Federation)

Créer un **Workload Identity Pool + Provider** pour GitHub et un **service account** avec les rôles nécessaires.

Rôles minimum typiques :
- **Artifact Registry Writer** (push d’image)
- **Kubernetes Engine Developer** (déployer sur GKE)
- (selon contexte) **Service Account Token Creator** / droits pour obtenir les credentials GKE

### 3) Secrets GitHub à créer

Dans GitHub → Settings → Secrets and variables → Actions, créer :

- `GCP_PROJECT_ID` : l’ID du projet (ex: `mon-projet-123`)
- `GCP_WIF_PROVIDER` : le resource name du provider WIF
- `GCP_SERVICE_ACCOUNT_EMAIL` : email du service account (ex: `github-deploy@...iam.gserviceaccount.com`)

### 4) Déploiement

Le workflow `Deploy to GKE` se déclenche :
- à chaque push sur `main`
- ou manuellement (workflow_dispatch)

Il :
1. build l’image `services/ts601-codec`
2. push dans Artifact Registry taggée avec `github.sha`
3. applique les manifests `deploy/gke/*.yaml`
4. met à jour l’image du Deployment `ts601-codec`

### 5) Ajuster les valeurs

Dans `.github/workflows/deploy-gke.yml`, modifie si besoin :
- `REGION`
- `AR_REPO`
- `GKE_CLUSTER`
- `GKE_LOCATION`

