# Runbook — ACS Magistrat-Douane

## 1. Déploiement production (première fois)

### Prérequis serveur
- Ubuntu 22.04+ / Debian 12
- Docker 24+ + Docker Compose v2
- Domaine DNS pointant vers le serveur
- Ports 80 et 443 ouverts

### Variables d'environnement obligatoires (`.env`)
```bash
# Sécurité
SECRET_KEY=<générer avec: python -c "import secrets; print(secrets.token_urlsafe(50))">
DEBUG=False
ALLOWED_HOSTS=votre-domaine.ci,www.votre-domaine.ci

# Base de données
DB_NAME=magistrat_douane
DB_USER=acs_user
DB_PASSWORD=<mot de passe fort>

# Redis
REDIS_URL=redis://redis:6379/0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@acs.ci
EMAIL_HOST_PASSWORD=<app password>
DEFAULT_FROM_EMAIL=ACS <noreply@acs.ci>

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
APP_VERSION=1.0.0

# SSL
SECURE_SSL_REDIRECT=True
```

### Étapes de déploiement
```bash
# 1. Cloner le dépôt
git clone https://github.com/xxx/magistrat-douane.git /app
cd /app

# 2. Créer le .env
cp .env.example .env
nano .env   # remplir les valeurs

# 3. Obtenir les certificats SSL (Let's Encrypt)
docker run --rm -p 80:80 certbot/certbot certonly \
  --standalone -d votre-domaine.ci -d www.votre-domaine.ci \
  --email admin@acs.ci --agree-tos --non-interactive

# 4. Copier les certificats dans le chemin attendu par nginx.conf
mkdir -p /etc/letsencrypt/live/votre-domaine.ci
# (certbot les place automatiquement dans /etc/letsencrypt)

# 5. Mettre à jour nginx.conf avec le vrai domaine
sed -i 's/votre-domaine.ci/MON-DOMAINE.ci/g' nginx.conf

# 6. Build et démarrage
docker compose build
docker compose up -d

# 7. Vérifier que tout tourne
docker compose ps
docker compose logs backend --tail=50

# 8. Créer le premier admin
docker compose exec backend python manage.py shell -c "
from accounts.models import User
u = User.objects.create_user(
    email='admin@acs.ci', password='ChangeMe123!',
    nom='Admin', prenoms='ACS', is_active=True, is_superuser=True
)
from accounts.models import User as U
U.objects.filter(pk=u.pk).update(role='admin', account_status='active')
print('Admin créé:', u.email)
"
```

---

## 2. Mise à jour (déploiement continu)

```bash
cd /app

# 1. Récupérer les changements
git pull origin main

# 2. Rebuild uniquement les services modifiés
docker compose build backend frontend

# 3. Redémarrer avec zéro downtime (backend d'abord, puis frontend)
docker compose up -d --force-recreate backend
docker compose up -d --force-recreate frontend nginx

# 4. Vérifier les migrations
docker compose logs backend --tail=30 | grep -E "Applying|Error"

# 5. Vérifier la santé
curl -sf https://votre-domaine.ci/api/health/ | python3 -m json.tool
```

---

## 3. Rollback

```bash
# Voir les images disponibles
docker images | grep magistrat-douane

# Revenir au commit précédent
git log --oneline -10
git checkout <commit-hash>
docker compose build backend
docker compose up -d --force-recreate backend

# Si migration à annuler
docker compose exec backend python manage.py migrate <app> <migration_precedente>
```

---

## 4. Test restore backup (à faire mensuellement)

```bash
# Déclencher un backup manuel si nécessaire
docker compose exec db_backup sh -c \
  'pg_dump | gzip > /backups/manual_$(date +%Y%m%d).sql.gz'

# Lancer le test de restore
chmod +x scripts/test_backup_restore.sh
./scripts/test_backup_restore.sh

# Résultat attendu : "✅ RESTORE VALIDÉ — Le backup est fonctionnel"
```

---

## 5. Configuration alertes Sentry (à faire une fois)

Dans le dashboard Sentry → **Alerts → Create Alert Rule** :

### Alerte 1 — Taux d'erreurs 5xx
- **Type** : Error rate
- **Condition** : Number of errors > 5 in 5 minutes
- **Filter** : `level:error`
- **Action** : Email + Slack #incidents
- **Name** : `[PROD] 5xx spike`

### Alerte 2 — Tâches Celery en échec
- **Type** : Error
- **Condition** : New issue matching `celery` in culprit
- **Action** : Email immédiat
- **Name** : `[PROD] Celery task failure`

### Alerte 3 — Latence API
- **Type** : Performance → Transaction duration
- **Condition** : p95 duration > 2000ms on `GET /api/*`
- **Timeframe** : 10 minutes
- **Action** : Email
- **Name** : `[PROD] API slow response`

---

## 6. Gestion des incidents

### Service down
```bash
# 1. Identifier le service en erreur
docker compose ps

# 2. Lire les logs
docker compose logs <service> --tail=100

# 3. Redémarrer
docker compose restart <service>

# 4. Si persistent : rollback (voir section 3)
```

### Base de données corrompue
```bash
# 1. Stopper le backend
docker compose stop backend celery_worker celery_beat

# 2. Identifier le dernier bon backup
docker run --rm -v magistrat-douane_db_backups:/backups alpine \
  ls -lht /backups/

# 3. Tester le restore (voir section 4)
# 4. Si OK : supprimer le volume et restaurer
docker compose down
docker volume rm magistrat-douane_postgres_data
docker compose up -d db
# attendre 10s
./scripts/test_backup_restore.sh /chemin/vers/le/bon/backup.sql.gz
```

### Checklist post-incident
- [ ] Incident résolu et service vérifié (`/api/health/`)
- [ ] Logs archivés
- [ ] Cause identifiée et documentée
- [ ] Action corrective planifiée
- [ ] Sentry issue marquée "resolved"
