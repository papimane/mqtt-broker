## Déploiement sur GKE (exemple)

Ce dossier fournit un exemple minimal pour exposer Mosquitto en TCP 1883 via un Service `LoadBalancer`, et déployer le service `ts601-codec` dans le cluster.

### 1) Build + push des images

Publie l’image `ts601-codec` dans Artifact Registry (ou un autre registry) et mets à jour l’image dans `ts601-codec.deployment.yaml`.

### 2) Appliquer les manifests

```bash
kubectl apply -f deploy/gke/namespace.yaml
kubectl apply -f deploy/gke/mosquitto.configmap.yaml
kubectl apply -f deploy/gke/mosquitto.deployment.yaml
kubectl apply -f deploy/gke/mosquitto.service.yaml
kubectl apply -f deploy/gke/ts601-codec.deployment.yaml
```

### 3) Récupérer l’IP publique du broker

```bash
kubectl -n mqtt get svc mosquitto
```

### Notes GCP

- Pour un vrai usage prod : ajoute TLS (8883), auth, persistance (PVC), monitoring, et durcissement réseau.
- Cloud Run n’est généralement pas adapté comme broker MQTT (connexions TCP longues, besoin d’un vrai LB TCP).

