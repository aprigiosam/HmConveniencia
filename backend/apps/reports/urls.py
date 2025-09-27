from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardMetricsView, ReportJobViewSet

router = DefaultRouter()
router.register(r"jobs", ReportJobViewSet, basename="report-job")

urlpatterns = [
    path("dashboard/", DashboardMetricsView.as_view(), name="dashboard-metrics"),
    path("", include(router.urls)),
]
