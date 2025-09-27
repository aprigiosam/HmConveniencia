from django.urls import path
from django.http import JsonResponse

def purchases_placeholder(request):
    return JsonResponse({"message": "Purchases API - Em desenvolvimento"})

urlpatterns = [
    path('', purchases_placeholder, name='purchases-placeholder'),
]
