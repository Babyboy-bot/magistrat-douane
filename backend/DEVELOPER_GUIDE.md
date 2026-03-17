# 📖 Guide Développeur - Magistrat Douane Platform

## 🚀 Démarrage Rapide

### Prérequis
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

### Configuration Environnement
```bash
# Backend (.env)
SECRET_KEY=votre_clé_secrète_ici
DEBUG=False
DATABASE_URL=postgresql://user:pass@localhost:5432/magistrat_db
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1

# Frontend (.env.local)
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/notifications/
```

---

## 🏗️ Architecture Technique

### Backend (Django)
```
backend/
├── accounts/          # Gestion utilisateurs
│   ├── models.py      # User, permissions
│   ├── views.py       # API endpoints
│   ├── serializers.py  # Data validation
│   └── urls.py        # Routing
├── core/              # Logique métier
│   ├── models.py      # ClientRequest, Document
│   ├── views.py       # API endpoints
│   └── serializers.py  # Data validation
├── notifications/     # WebSocket
│   ├── consumers.py   # WebSocket handlers
│   └── config.py      # Configuration
└── config/           # Configuration Django
    ├── settings.py    # Settings principaux
    ├── urls.py        # URLs globales
    └── asgi.py        # ASGI application
```

### Frontend (Next.js)
```
frontend/src/
├── app/               # Pages Next.js
│   ├── agent/        # Interface agents
│   ├── client/       # Interface clients
│   └── admin/        # Interface admin
├── components/        # Composants UI
│   └── ui/           # shadcn/ui components
├── hooks/            # Hooks personnalisés
│   ├── use-api-data.ts
│   └── use-websocket.ts
├── lib/              # Utilitaires
│   ├── api.ts        # API client
│   └── types.ts      # Types TypeScript
└── stores/           # State management
    └── auth-store.ts
```

---

## 🔧 Développement

### Backend - Créer un nouvel endpoint

1. **Modèle** (`core/models.py`)
```python
class NouveauModele(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.nom
```

2. **Serializer** (`core/serializers.py`)
```python
class NouveauModeleSerializer(serializers.ModelSerializer):
    class Meta:
        model = NouveauModele
        fields = ['id', 'nom', 'description', 'created_at']
```

3. **Vue** (`core/views.py`)
```python
from rest_framework import generics
from .models import NouveauModele
from .serializers import NouveauModeleSerializer

class NouveauModeleListCreateView(generics.ListCreateAPIView):
    queryset = NouveauModele.objects.all()
    serializer_class = NouveauModeleSerializer
```

4. **URL** (`core/urls.py`)
```python
from django.urls import path
from .views import NouveauModeleListCreateView

urlpatterns = [
    path('nouveaux/', NouveauModeleListCreateView.as_view()),
]
```

### Frontend - Créer une nouvelle page

1. **Page** (`app/nouvelle/page.tsx`)
```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NouvellePage() {
  const [data, setData] = useState([]);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle Page</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Contenu de la page */}
        </CardContent>
      </Card>
    </div>
  );
}
```

2. **Hook API** (`hooks/use-nouvelles-donnees.ts`)
```typescript
import { useApi } from "@/hooks/use-api-data";

export function useNouvellesDonnees() {
  return useApi('/api/nouveaux/');
}
```

---

## 🧪 Tests

### Tests Unitaires Backend
```python
# tests/test_models.py
from django.test import TestCase
from core.models import NouveauModele

class NouveauModeleTest(TestCase):
    def test_creation_modele(self):
        modele = NouveauModele.objects.create(
            nom="Test",
            description="Description test"
        )
        self.assertEqual(modele.nom, "Test")
        self.assertEqual(str(modele), "Test")
```

### Tests Frontend
```typescript
// __tests__/components/NouveauComposant.test.tsx
import { render, screen } from '@testing-library/react';
import NouveauComposant from '@/components/NouveauComposant';

test('rend correctement', () => {
  render(<NouveauComposant />);
  expect(screen.getByText('Contenu')).toBeInTheDocument();
});
```

### Lancer les tests
```bash
# Backend
python manage.py test

# Frontend
npm test
```

---

## 🔐 Sécurité

### Validation des entrées
```python
# serializers.py
from rest_framework import serializers

class SecureSerializer(serializers.Serializer):
    nom = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    
    def validate_nom(self, value):
        if 'invalide' in value.lower():
            raise serializers.ValidationError("Nom invalide")
        return value
```

### Permissions
```python
# permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user or request.method in permissions.SAFE_METHODS
```

### Configuration CORS
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://votredomaine.com",
]

CORS_ALLOW_CREDENTIALS = True
```

---

## 📊 Monitoring

### Logs
```python
# views.py
import logging

logger = logging.getLogger(__name__)

class MaVue(APIView):
    def get(self, request):
        logger.info(f"Requête reçue: {request.user}")
        return Response({"status": "ok"})
```

### Métriques
```python
# middleware.py
import time
from django.utils.deprecation import MiddlewareMixin

class TimingMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()
        return None
    
    def process_response(self, request, response):
        duration = time.time() - request.start_time
        logger.info(f"Requête traitée en {duration:.3f}s")
        return response
```

---

## 🚀 Déploiement

### Docker
```dockerfile
# Dockerfile
FROM python:3.12

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: magistrat_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  backend:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/magistrat_db
      - REDIS_URL=redis://redis:6379/0

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## 🐛 Debugging

### Backend Debug
```python
# settings.py
DEBUG = True

# Logging détaillé
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}
```

### Frontend Debug
```typescript
// utils/debug.ts
export const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data);
  }
};
```

---

## 📚 Bonnes Pratiques

### Code Backend
- ✅ Utiliser les managers pour les requêtes complexes
- ✅ Sélectionner uniquement les champs nécessaires
- ✅ Utiliser `select_related` et `prefetch_related`
- ✅ Valider les entrées côté serializer
- ✅ Gérer les exceptions correctement

### Code Frontend
- ✅ Utiliser TypeScript strict
- ✅ Créer des composants réutilisables
- ✅ Utiliser les hooks personnalisés
- ✅ Gérer les états de chargement
- ✅ Optimiser les rendus avec useMemo/useCallback

### Base de données
- ✅ Utiliser les indexes appropriés
- ✅ Éviter les N+1 queries
- ✅ Utiliser le cache Redis
- ✅ Optimiser les requêtes

---

## 🔄 Git Workflow

### Branches
```
main                    # Production
develop                 # Développement
feature/nom-feature    # Nouvelle fonctionnalité
hotfix/nom-fix        # Correction urgente
```

### Commits
```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: mise à jour documentation
style: formatage du code
refactor: refactoring du code
test: ajout de tests
```

---

## 📞 Support

### Erreurs Communes
- **ModuleNotFoundError**: `pip install -r requirements.txt`
- **MigrationError**: `python manage.py migrate`
- **PermissionError**: Vérifier les permissions Django
- **CORS Error**: Configurer ALLOWED_HOSTS

### Ressources
- 📚 [Documentation Django](https://docs.djangoproject.com/)
- 📚 [Documentation React](https://react.dev/)
- 📚 [Documentation Next.js](https://nextjs.org/docs)
- 📚 [Documentation DRF](https://www.django-rest-framework.org/)

---

## 🎯 Prochaines Étapes

1. **Familiarisation** (1 semaine)
   - Architecture globale
   - Workflow magistrats
   - Environnement de dev

2. **Développement** (2-3 semaines)
   - Première fonctionnalité
   - Tests unitaires
   - Documentation

3. **Intégration** (1 semaine)
   - Code review
   - Tests d'intégration
   - Déploiement staging

4. **Production** (1 semaine)
   - Déploiement production
   - Monitoring
   - Support

---

*Guide développeur généré automatiquement - Dernière mise à jour: 2026-02-17*
