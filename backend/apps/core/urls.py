from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("catalog/", include("apps.catalog.urls")),
    path("inventory/", include("apps.inventory.urls")),
    path("sales/", include("apps.sales.urls")),
    path("purchases/", include("apps.purchases.urls")),
    path("finance/", include("apps.finance.urls")),
    path("reports/", include("apps.reports.urls")),
]
