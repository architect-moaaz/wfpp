# Workflow Platform - Deployment Guide

## Table of Contents
1. [Quick Start (Docker Compose)](#quick-start-docker-compose)
2. [Production Deployment (Kubernetes)](#production-deployment-kubernetes)
3. [Cloud Platform Deployments](#cloud-platform-deployments)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Security Considerations](#security-considerations)
6. [Monitoring & Observability](#monitoring--observability)
7. [Scaling Strategy](#scaling-strategy)

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker 20.10+ and Docker Compose v2
- 4GB RAM minimum, 8GB recommended
- Anthropic API key

### Steps:

```bash
# 1. Clone repository
git clone <your-repo>
cd workflowpp

# 2. Create environment file
cat > .env <<EOF
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=workflowpp
ANTHROPIC_API_KEY=your-anthropic-api-key
EOF

# 3. Build and start services
docker-compose up -d

# 4. Check status
docker-compose ps
docker-compose logs -f

# 5. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# PostgreSQL: localhost:5432
```

### Docker Compose Features:
- Health checks for all services
- Automatic restart on failure
- Volume persistence for database
- Redis caching layer
- Resource limits configured

---

## Production Deployment (Kubernetes)

### Recommended: Managed Kubernetes

**Best Options:**
1. **AWS EKS** - Best for AWS ecosystem integration
2. **Google GKE** - Best Autopilot mode, easiest management
3. **Azure AKS** - Best for Microsoft stack integration
4. **DigitalOcean Kubernetes** - Best for cost/simplicity balance

### Architecture Overview:

```
Internet
   │
   ▼
[Load Balancer / Ingress]
   │
   ├─► Frontend Service (2-5 replicas)
   │   └─► Static React App (Nginx)
   │
   ├─► Backend Service (3-10 replicas)
   │   ├─► API Server
   │   ├─► WebSocket Server
   │   └─► Workflow Runtime Engine
   │
   ├─► PostgreSQL (Primary + Read Replica)
   │   └─► Persistent Volume (100GB+)
   │
   └─► Redis Cache (2-3 replicas)
       └─► Session storage
       └─► Distributed locks
```

### Prerequisites:
```bash
# Install kubectl
brew install kubectl  # macOS
# or: sudo apt-get install kubectl  # Linux

# Install helm
brew install helm

# Configure cloud provider CLI
aws configure  # For EKS
gcloud init    # For GKE
az login       # For AKS
```

### Deployment Steps:

```bash
# 1. Create namespace
kubectl create namespace workflowpp

# 2. Create secrets
kubectl create secret generic backend-secrets \
  --from-literal=DB_PASSWORD=your-secure-password \
  --from-literal=ANTHROPIC_API_KEY=your-api-key \
  -n workflowpp

# 3. Deploy PostgreSQL (using Helm)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgres bitnami/postgresql \
  --namespace workflowpp \
  --set auth.postgresPassword=your-password \
  --set auth.database=workflowpp \
  --set primary.persistence.size=100Gi \
  --set readReplicas.replicaCount=1

# 4. Deploy Redis
helm install redis bitnami/redis \
  --namespace workflowpp \
  --set replica.replicaCount=2 \
  --set auth.enabled=false

# 5. Deploy Backend
kubectl apply -f k8s/backend-deployment.yaml

# 6. Deploy Frontend
kubectl apply -f k8s/frontend-deployment.yaml

# 7. Deploy Ingress
kubectl apply -f k8s/ingress.yaml

# 8. Check deployment
kubectl get all -n workflowpp
kubectl describe pods -n workflowpp
```

### Scaling Configuration:

**Horizontal Pod Autoscaling (HPA):**
- Backend: 3-10 replicas based on CPU (70%) and Memory (80%)
- Frontend: 2-5 replicas based on traffic
- Auto-scale on workflow execution load

**Vertical Scaling:**
- Backend pods: 512Mi-2Gi memory, 0.5-2 CPU cores
- Frontend pods: 128Mi-512Mi memory, 0.25-1 CPU cores

---

## Cloud Platform Deployments

### Option 1: AWS (Recommended for Enterprise)

**Services Used:**
- **EKS** - Kubernetes cluster
- **RDS PostgreSQL** - Managed database with automatic backups
- **ElastiCache Redis** - Managed Redis cluster
- **ALB** - Application Load Balancer
- **CloudFront** - CDN for static assets
- **S3** - File storage for workflows/forms
- **CloudWatch** - Logging and monitoring
- **Secrets Manager** - API keys and credentials

**Cost Estimate:** $500-2000/month depending on scale

**Architecture:**
```
CloudFront CDN
   │
   ▼
ALB (Application Load Balancer)
   │
   ├─► EKS Cluster
   │   ├─► Frontend Pods (t3.small instances)
   │   └─► Backend Pods (t3.medium instances)
   │
   ├─► RDS PostgreSQL (db.t3.medium)
   │   └─► Multi-AZ deployment
   │
   └─► ElastiCache Redis (cache.t3.small)
```

**Deployment:**
```bash
# 1. Create EKS cluster
eksctl create cluster \
  --name workflowpp-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# 2. Create RDS database
aws rds create-db-instance \
  --db-instance-identifier workflowpp-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username admin \
  --master-user-password your-password \
  --allocated-storage 100 \
  --multi-az

# 3. Create ElastiCache Redis
aws elasticache create-replication-group \
  --replication-group-id workflowpp-redis \
  --replication-group-description "Workflow cache" \
  --engine redis \
  --cache-node-type cache.t3.small \
  --num-cache-clusters 2

# 4. Deploy application to EKS
kubectl apply -f k8s/
```

### Option 2: Google Cloud Platform

**Services Used:**
- **GKE Autopilot** - Fully managed Kubernetes
- **Cloud SQL for PostgreSQL** - Managed database
- **Memorystore for Redis** - Managed Redis
- **Cloud Load Balancing** - Global load balancer
- **Cloud CDN** - Content delivery
- **Cloud Storage** - File storage
- **Cloud Logging** - Centralized logs

**Cost Estimate:** $400-1800/month

**Deployment:**
```bash
# 1. Create GKE Autopilot cluster
gcloud container clusters create-auto workflowpp-prod \
  --region=us-central1

# 2. Create Cloud SQL instance
gcloud sql instances create workflowpp-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=us-central1

# 3. Deploy to GKE
kubectl apply -f k8s/
```

### Option 3: DigitalOcean (Best for Small-Medium Scale)

**Services Used:**
- **DigitalOcean Kubernetes** - Managed K8s
- **Managed PostgreSQL** - Database cluster
- **Managed Redis** - Cache cluster
- **Load Balancer** - Traffic distribution
- **Spaces** - Object storage

**Cost Estimate:** $200-800/month (most cost-effective)

**Deployment:**
```bash
# 1. Create cluster via DigitalOcean UI
# 2. Get kubeconfig
doctl kubernetes cluster kubeconfig save workflowpp-prod

# 3. Create managed database
doctl databases create workflowpp-db \
  --engine pg \
  --region nyc1 \
  --size db-s-2vcpu-4gb

# 4. Deploy
kubectl apply -f k8s/
```

### Option 4: Azure

**Services Used:**
- **AKS** - Azure Kubernetes Service
- **Azure Database for PostgreSQL** - Managed database
- **Azure Cache for Redis** - Managed Redis
- **Application Gateway** - Load balancer
- **Azure CDN** - Content delivery
- **Azure Monitor** - Observability

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and push backend
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/backend:${{ github.sha }} ./backend
          docker push ${{ secrets.DOCKER_REGISTRY }}/backend:${{ github.sha }}

      - name: Build and push frontend
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/frontend:${{ github.sha }} ./ui
          docker push ${{ secrets.DOCKER_REGISTRY }}/frontend:${{ github.sha }}

      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v1
        with:
          manifests: |
            k8s/backend-deployment.yaml
            k8s/frontend-deployment.yaml
          images: |
            ${{ secrets.DOCKER_REGISTRY }}/backend:${{ github.sha }}
            ${{ secrets.DOCKER_REGISTRY }}/frontend:${{ github.sha }}
          kubectl-version: 'latest'
```

---

## Security Considerations

### 1. Network Security
```yaml
# Network Policy example
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 5000
```

### 2. Secrets Management
- Use **Kubernetes Secrets** or cloud provider secret managers
- Rotate credentials regularly
- Never commit secrets to git
- Use **Sealed Secrets** or **External Secrets Operator**

### 3. SSL/TLS
```bash
# Install cert-manager for automatic SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f k8s/cert-issuer.yaml
```

### 4. Pod Security Standards
- Use non-root containers (already configured in Dockerfiles)
- Enable read-only root filesystem where possible
- Set resource limits
- Use security contexts

---

## Monitoring & Observability

### Recommended Stack: Prometheus + Grafana

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Default: admin/prom-operator
```

### Key Metrics to Monitor:
- **Backend:**
  - Request rate, latency, error rate
  - Workflow execution time
  - Active workflow instances
  - Queue depth
  - Database connection pool
  - Memory usage

- **Database:**
  - Connection count
  - Query performance
  - Replication lag
  - Disk usage

- **Infrastructure:**
  - Pod CPU/memory usage
  - Node health
  - Network traffic
  - Disk I/O

### Logging Strategy:
```bash
# Install EFK stack (Elasticsearch, Fluentd, Kibana)
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
helm install fluentd fluent/fluentd -n logging
```

---

## Scaling Strategy

### Vertical Scaling (Scale Up)
**When:** Single workflow execution is slow
**How:** Increase pod resources (CPU/memory)

```yaml
resources:
  requests:
    memory: "1Gi"  # Increase from 512Mi
    cpu: "1000m"   # Increase from 500m
  limits:
    memory: "4Gi"  # Increase from 2Gi
    cpu: "4000m"   # Increase from 2000m
```

### Horizontal Scaling (Scale Out)
**When:** High concurrent workflow executions
**How:** Increase replica count

```bash
kubectl scale deployment backend --replicas=10 -n workflowpp
```

### Database Scaling
1. **Read Replicas:** For read-heavy workloads
2. **Connection Pooling:** Use PgBouncer
3. **Partitioning:** Partition large tables by date
4. **Caching:** Redis for frequently accessed data

### Cost Optimization
- Use **spot instances** for non-critical workloads
- Enable **cluster autoscaler** for dynamic scaling
- Use **S3/Cloud Storage** for archival data
- Implement **request throttling** to prevent abuse

---

## Production Checklist

### Pre-Deployment
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups (database + file storage)
- [ ] Set up SSL certificates
- [ ] Configure DNS
- [ ] Test disaster recovery procedures
- [ ] Set up log aggregation
- [ ] Configure security policies
- [ ] Load test the application

### Post-Deployment
- [ ] Verify all services are healthy
- [ ] Test end-to-end workflow execution
- [ ] Monitor error rates
- [ ] Set up on-call rotation
- [ ] Document runbooks
- [ ] Schedule regular penetration testing

---

## Troubleshooting

### Pod won't start
```bash
kubectl describe pod <pod-name> -n workflowpp
kubectl logs <pod-name> -n workflowpp
```

### Database connection issues
```bash
# Test from backend pod
kubectl exec -it <backend-pod> -n workflowpp -- psql -h postgres-service -U postgres
```

### High memory usage
```bash
# Check resource usage
kubectl top pods -n workflowpp
kubectl top nodes
```

---

## Support & Resources

- **Documentation:** See `/docs` folder
- **Issues:** GitHub Issues
- **Monitoring:** Grafana dashboard at `/monitoring`
- **Health Check:** `http://your-domain/health`

---

**Estimated Monthly Costs by Scale:**

| Scale | Users | Workflows/Day | Infrastructure | Total Cost |
|-------|-------|---------------|----------------|------------|
| Small | <100 | <1,000 | DO/GCP | $200-400/mo |
| Medium | 100-1,000 | 1,000-10,000 | AWS/GCP | $800-1,500/mo |
| Large | 1,000-10,000 | 10,000-100,000 | AWS EKS | $2,000-5,000/mo |
| Enterprise | 10,000+ | 100,000+ | AWS Multi-Region | $10,000+/mo |
