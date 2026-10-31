# Magistrat-Douane — Plateforme MAGIST'ASSUR

Plateforme de souscription et de gestion des contrats d'assurance **MAGIST'ASSUR** (Épargne & Prévoyance), développée pour l'Association des Cadres Supérieurs de la Douane de Côte d'Ivoire, en partenariat avec **NSIA Vie Assurances**.

Trois espaces dédiés : **client** (souscripteur), **agent** (gestion des contrats et sinistres) et **admin** (pilotage).

## Fonctionnalités

### Espace client
- Parcours complet : inscription, vérification d'email, connexion, mot de passe oublié
- **Cotation** et **souscription** en ligne aux contrats Épargne & Prévoyance
- **Portefeuille** de contrats, cotisations et historique des paiements
- **Déclaration et suivi des sinistres**
- Documents personnels et profil

### Espace agent
- Gestion des **clients**, **émissions** et **requêtes**
- Module **MAGIST'ASSUR** : contrats Épargne (bénéficiaires, cotisations, correspondants) et Prévoyance (assurés associés, questionnaire médical)
- Traitement des **sinistres**

### Espace admin
- Tableau de bord, gestion des **agents**, journal d'**audit** (connexions, actions sensibles)
- Monitoring des utilisateurs en ligne

### Socle technique
- **Notifications temps réel** via WebSocket (Django Channels + Redis)
- **Tâches asynchrones** Celery (emails, traitements différés)
- **Exports Excel et PDF** (openpyxl, reportlab)
- **Documentation API OpenAPI** générée automatiquement (drf-spectacular)
- **Monitoring** des erreurs avec Sentry
- Traçabilité : `AuditEntry` + `UserAuditLog` sur les actions sensibles

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | **Next.js 15** (App Router) · TypeScript · React 18 |
| UI | Tailwind CSS v4 · shadcn/ui (Radix) · Recharts |
| Data | TanStack Query v5 · Zustand · React Hook Form + Zod |
| Backend | **Django 5.2** · DRF 3.17 · Channels (WebSocket) |
| Auth | JWT en cookies httpOnly (SimpleJWT) |
| Temps réel | Daphne (ASGI) + Redis Channel Layer |
| Async | Celery + Redis |
| BDD | PostgreSQL 16 |
| Qualité | pytest (backend) · Playwright (frontend) · Sentry |
| Infra | Docker + Compose · Nginx · Caddy |

## Structure du projet

```
magistrat-douane/
├── backend/            # Django — API REST + WebSocket
│   ├── accounts/       # Utilisateurs, rôles, audit de connexion
│   ├── core/           # Émissions, paiements, requêtes, documents, audit
│   ├── magistassur/    # Contrats Épargne & Prévoyance, bénéficiaires,
│   │                   # cotisations, questionnaire médical
│   ├── notifications/  # Consumers WebSocket, notifications
│   ├── config/         # Settings, ASGI, Celery, URLs racine
│   └── tests/          # pytest
├── frontend/           # Next.js 15 — espaces client / agent / admin
│   └── src/
│       ├── app/        # Routes (client/, agent/, admin/, login…)
│       ├── components/ # UI (shadcn) + composants métier
│       ├── hooks/      # Hooks React Query
│       ├── lib/api/    # Client API
│       └── stores/     # Zustand (auth)
├── tests/              # Tests E2E
├── scripts/            # Scripts utilitaires
├── nginx/              # Configuration reverse proxy
├── public/
├── Caddyfile           # Config Caddy (TLS auto)
├── docker-compose.yml      # Production
├── docker-compose.dev.yml  # Développement local
└── env.example         # Variables d'environnement à copier en .env
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
- Doc API (OpenAPI) : http://localhost:8000/api/docs/

## Tests

```bash
# Backend (pytest)
cd backend && pytest

# Frontend (Playwright)
cd frontend && npx playwright test
```

## Branches Git

| Branche | Rôle |
|---|---|
| `main` | Production stable — merge uniquement via PR validée |
| `develop` | Intégration — base pour toutes les features |
| `backend/<nom>` | Features backend |
| `frontend/<nom>` | Features frontend |

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

## Documentation complémentaire

- `backend/API_DOCUMENTATION.md` — endpoints de l'API
- `backend/DEVELOPER_GUIDE.md` — guide développeur

## Équipe

| Rôle | Périmètre |
|---|---|
| Backend | Django, DRF, Channels, Celery, migrations, sécurité |
| Frontend | Next.js, composants, formulaires, UI/UX |
