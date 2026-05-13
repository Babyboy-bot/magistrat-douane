from django.utils.text import slugify
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from core.services import get_dashboard_stats

COMPAGNIES_DATA = [
    "Activa Assurances", "AFG Assurances", "Amsa Assurances",
    "Atlanta Assurances", "Atlantique Assurances", "AXA Assurances",
    "Coris Assurances", "GNA CI", "NSIA Assurances", "SanlamAllianz",
    "SCHIBA", "Sérenity", "SAAR CI", "SUNU Assurances IARD",
]


class CompagnieListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip().lower()
        results = [
            name
            for name in COMPAGNIES_DATA
            if not search or search in name.lower()
        ]
        return Response(results)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats_view(request):
    from django.core.cache import cache
    user = request.user
    cache_key = f"dashboard_stats_{user.id}_{user.role}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)
    data = get_dashboard_stats(user)
    cache.set(cache_key, data, timeout=60)
    return Response(data)
