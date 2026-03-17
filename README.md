# Magistrat-Douane — Plateforme ACS

Application de souscription aux contrats d'assurance **MAGIST'ASSUR** (Épargne & Prévoyance) développée pour l'Association des Cadres Supérieurs de la Douane de Côte d'Ivoire, en partenariat avec NSIA Vie Assurances.

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui |
| Backend | Django 5 + Django REST Framework + Django Channels |
| Auth | JWT httpOnly cookies (SimpleJWT) |
| Temps réel | WebSocket via Daphne (ASGI) + Redis Channel Layer |
| Base de données | PostgreSQL 16 |
| Cache / Broker | Redis 7 |
| Conteneurs | Docker + Docker Compose |

## Structure du projet

```
magistrat-douane/
├── backend/          # Django — API REST + WebSocket
│   ├── accounts/     # Authentification, utilisateurs, rôles
│   ├── core/         # Émissions, paiements, requêtes clients
│   ├── magistassur/  # Contrats Épargne & Prévoyance
│   ├── notifications/# Consumers WebSocket
│   └── config/       # Settings, ASGI, URLs
├── frontend/         # Next.js — interface client + agent + admin
│   └── src/
│       ├── app/      # Pages (client/, agent/, admin/)
│       ├── components/
│       ├── hooks/
│       ├── lib/      # API client
│       └── stores/   # Zustand (auth)
├── shared/           # Types partagés front/back
├── docker-compose.yml        # Production
├── docker-compose.dev.yml    # Développement local
└── env.example               # Variables d'environnement à copier en .env
```

## Démarrage rapide (dev)

```bash
# 1. Copier les variables d'environnement
cp env.example .env
# Éditer .env : DB_PASSWORD, SECRET_KEY, etc.

# 2. Lancer tous les services
docker compose -f docker-compose.dev.yml up --build
```

- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- Admin Django : http://localhost:8000/admin

## Branches Git

| Branche | Rôle |
|---|---|
| `main` | Production stable — merge uniquement via PR validée |
| `develop` | Intégration — base pour toutes les features |
| `backend/<nom>` | Features backend (ex: `backend/cinetpay`) |
| `frontend/<nom>` | Features frontend (ex: `frontend/dashboard-v2`) |

## Workflow collaboratif

```bash
# Démarrer une nouvelle feature
git checkout develop
git pull origin develop
git checkout -b backend/ma-feature   # ou frontend/ma-feature

# Committer et pousser
git add .
git commit -m "feat(backend): description courte"
git push origin backend/ma-feature
# → Ouvrir une Pull Request vers develop sur GitHub
```

## Variables d'environnement

Copier `env.example` → `.env` et remplir :

| Variable | Description |
|---|---|
| `SECRET_KEY` | Clé Django (générer avec `python -c "import secrets; print(secrets.token_hex(50))"`) |
| `DB_PASSWORD` | Mot de passe PostgreSQL |
| `NEXT_PUBLIC_API_BASE` | URL backend (ex: `https://api.mon-domaine.ci`) |
| `NEXT_PUBLIC_WS_URL` | URL WebSocket prod (ex: `wss://api.mon-domaine.ci`) |

## Équipe

| Rôle | Périmètre |
|---|---|
| Backend | Django, DRF, Channels, migrations, sécurité |
| Frontend | Next.js, composants, formulaires, UI/UX |
