from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import LojaViewSet, ClienteViewSet, FormaPagamentoViewSet
from .auth_views import login_view, logout_view, user_profile


def health_check(request):
    return JsonResponse({"status": "ok"})


router = DefaultRouter()
router.register(r'lojas', LojaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'formas-pagamento', FormaPagamentoViewSet)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("auth/login/", login_view, name="auth-login"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/profile/", user_profile, name="auth-profile"),
    path("", include(router.urls)),
    path("catalog/", include("apps.catalog.urls")),
    path("inventory/", include("apps.inventory.urls")),
    path("sales/", include("apps.sales.urls")),
    path("purchases/", include("apps.purchases.urls")),
    path("finance/", include("apps.finance.urls")),
    path("reports/", include("apps.reports.urls")),
]
