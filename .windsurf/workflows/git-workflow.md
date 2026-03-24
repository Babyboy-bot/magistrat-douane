---
description: Workflow Git collaboratif — éviter les conflits entre backend et frontend
---

## Branches permanentes

| Branche | Règle |
|---|---|
| `main` | Production stable — JAMAIS de push direct, uniquement merge via PR depuis `develop` |
| `develop` | Intégration — base de toutes les features |

## Préfixes de branches de travail

| Préfixe | Qui | Exemple |
|---|---|---|
| `backend/` | Dev backend | `backend/cinetpay` |
| `frontend/` | Dev frontend | `frontend/dashboard-stats` |
| `fix/` | N'importe qui | `fix/refresh-token` |
| `hotfix/` | Urgence prod | `hotfix/login-crash` |

## Workflow quotidien

### 1. Démarrer une feature

```bash
git checkout develop
git pull origin develop
git checkout -b backend/ma-feature
```

### 2. Commiter régulièrement (petits commits)

```bash
git add backend/mon_fichier.py
git commit -m "feat(backend): ajouter endpoint paiement CinetPay"
```

Format des messages de commit :
- `feat(scope): description` — nouvelle fonctionnalité
- `fix(scope): description` — correction de bug
- `chore(scope): description` — maintenance (migrations, deps)
- `refactor(scope): description` — refactoring sans changement de comportement

### 3. Pousser et ouvrir une PR

```bash
git push origin backend/ma-feature
# → Ouvrir PR vers develop sur GitHub
```

### 4. Merger dans develop (après review)

Faire le merge sur GitHub via l'interface PR.

---

## Éviter les conflits — règles clés

### Règle 1 : Chacun son périmètre

- **Backend** touche : `backend/`, `docker-compose*.yml`, `env.example`
- **Frontend** touche : `frontend/`
- **Partagé** (communiquer avant) : `README.md`, `.gitignore`, `.gitattributes`

### Règle 2 : Toujours rebaser sur develop avant de pousser

```bash
git checkout develop
git pull origin develop
git checkout backend/ma-feature
git rebase develop
# Résoudre les conflits s'il y en a, puis :
git push origin backend/ma-feature --force-with-lease
```

### Règle 3 : Ne jamais commiter .env

Le fichier `.env` est dans `.gitignore`. Partager les nouvelles variables via `env.example`.

### Règle 4 : Ne jamais commiter les migrations sans les tester

```bash
python manage.py makemigrations
python manage.py migrate
# Tester que tout fonctionne, puis commiter
git add backend/magistassur/migrations/
git commit -m "chore(db): migration ajout champ consentement_donnees"
```

---

## Scénario typique de conflit et résolution

```bash
# Conflit sur develop après merge d'une autre PR
git checkout backend/ma-feature
git fetch origin
git rebase origin/develop

# Git signale un conflit dans backend/core/models.py
# Ouvrir le fichier, chercher les marqueurs <<<<<<, =======, >>>>>>>
# Choisir ou fusionner les deux versions
git add backend/core/models.py
git rebase --continue
```

---

## Synchronisation collègue (frontend)

```bash
# Cloner la première fois
git clone https://github.com/Babyboy-bot/magistrat-douane.git
cd magistrat-douane
git checkout develop

# Chaque matin
git pull origin develop

# Créer sa branche de travail
git checkout -b frontend/ma-feature
```
