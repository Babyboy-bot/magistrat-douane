# Tests de Simulation — Magistrat-Douane

## 1. Workflows E2E Django (Backend)

Simulent des parcours utilisateurs complets via l'API Django.

```bash
cd backend
$env:SECRET_KEY="django-insecure-test-key"; $env:DEBUG="True"; $env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME=":memory:"; $env:REDIS_URL=""
python -m pytest tests/ -v --tb=short --no-cov
```

**8 simulations couvertes :**
- Cotation automobile (client → agent → devis → validation → attestations)
- Souscription Magist'Assur Épargne (client → agent → police → cotisations)
- Souscription Magist'Assur Prévoyance (client → agent → police → sinistre)
- Déclaration de sinistre (client → agent → traitement)
- Changement de police (client → agent → clôture)
- Agents concurrents (deux agents → conflit 409)
- Import CSV + dashboard (admin → agent → client)
- Upload carte grise liée à une demande

## 2. Playwright (Frontend navigateur)

Simulent un vrai navigateur qui navigue sur le frontend Next.js.

```bash
cd frontend
npx playwright test                    # headless
npx playwright test --headed           # avec fenêtre visible
npx playwright test --ui               # interface interactive
```

**7 simulations couvertes :**
- Connexion client/agent (login → dashboard)
- Identifiants incorrects (login → erreur)
- Pages publiques (accueil, register, reset-password)
- Inscription client
- Navigation client authentifié (portfolio, history, sinistre, habitation, profile)
- Navigation agent authentifié (requests, emissions, clients, magistassur)
- Formulaire de déclaration de sinistre

## 3. Locust (Charge/performance)

Simule des dizaines/centaines d'utilisateurs simultanés sur l'API.

```bash
pip install locust
cd backend
locust -f tests/locustfile.py --host=http://127.0.0.1:8000
```

Puis ouvrir http://localhost:8089 et configurer :
- Number of users : 50 (commencer petit)
- Ramp-up : 5 (utilisateurs/seconde)
- Host : http://127.0.0.1:8000

**3 profils simulés :**
- Client (60%) : dashboard, emissions, requests, création cotation
- Agent (30%) : dashboard, demandes, emissions, magistassur
- Admin (10%) : dashboard, audit trail, import

## 4. MSW (API mock frontend)

Simule les réponses de l'API backend pour tester le frontend sans backend.

```bash
cd frontend
npm install -D msw
npx msw init public/ --save
```

Pour activer les mocks en dev, ajouter dans `src/app/layout.tsx` :
```ts
if (process.env.NODE_ENV === "test") {
  const { worker } = await import("../tests/mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}
```

**Endpoints mockés :**
- Auth (login, register, refresh, logout, me)
- Dashboard stats
- Emissions (list, detail)
- Requests (list, create, claim, treat, devis, valider, attestations)
- Magistassur (epargne, prevoyance)
- Notifications
- Compagnies, Audit trail
