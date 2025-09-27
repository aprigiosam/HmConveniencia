from django.urls import path
from django.http import JsonResponse

def reports_placeholder(request):
    return JsonResponse({"message": "Reports API - Em desenvolvimento"})

urlpatterns = [
    path('', reports_placeholder, name='reports-placeholder'),
]
