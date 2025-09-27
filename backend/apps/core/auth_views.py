from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        logger.warning("Login attempt with missing credentials for user=%s", username or '<blank>')
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)

    if user:
        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)
        logger.info("User %s authenticated successfully", user.username)
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            },
            'token': token.key
        })

    logger.warning("Invalid credentials for user=%s", username)
    return Response(
        {'error': 'Invalid credentials'},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
def logout_view(request):
    if request.user.is_authenticated:
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
        except Token.DoesNotExist:
            pass

        logout(request)
        logger.info("User %s logged out", request.user.username)
        return Response({'message': 'Logout successful'})

    return Response(
        {'error': 'User not authenticated'},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['GET'])
def user_profile(request):
    if request.user.is_authenticated:
        return Response({
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'is_staff': request.user.is_staff
            }
        })

    return Response(
        {'error': 'User not authenticated'},
        status=status.HTTP_401_UNAUTHORIZED
    )
