from rest_framework.routers import DefaultRouter
from .views import ContratEpargneViewSet, ContratPrevoyanceViewSet

router = DefaultRouter()
router.register(r"magistassur/epargne", ContratEpargneViewSet, basename="epargne")
router.register(r"magistassur/prevoyance", ContratPrevoyanceViewSet, basename="prevoyance")

urlpatterns = router.urls
