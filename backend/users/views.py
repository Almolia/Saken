from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .jwt import clear_auth_cookies, create_token_pair_for_user, set_auth_cookies
from .models import User, UserRole
from .permissions import IsManagerOrAdmin
from .serializers import (
    AdminPasswordChangeSerializer,
    AuthUserSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserRoleUpdateSerializer,
    UserSerializer,
    UserStatusSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'ثبت‌نام با موفقیت انجام شد.',
                'user': AuthUserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        access_token, refresh_token = create_token_pair_for_user(user)
        response = Response(
            {
                'message': 'ورود با موفقیت انجام شد.',
                'user': AuthUserSerializer(user).data,
            }
        )
        return set_auth_cookies(response, request, access_token, refresh_token)


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass
            except AttributeError:
                pass
        response = Response({'message': 'خروج با موفقیت انجام شد.'})
        return clear_auth_cookies(response)


class CurrentUserView(APIView):
    def get(self, request):
        if request.user.is_disabled or not request.user.is_active:
            return Response({'detail': 'حساب کاربری شما غیرفعال شده است.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({'user': AuthUserSerializer(request.user).data})


class UserListView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        users = User.objects.order_by('-date_joined')
        active_count = users.filter(is_active=True, is_disabled=False).count()
        disabled_count = users.filter(is_disabled=True).count()
        return Response(
            {
                'stats': {
                    'total': users.count(),
                    'active': active_count,
                    'disabled': disabled_count,
                },
                'users': UserSerializer(users, many=True).data,
            }
        )


class UserStatusToggleView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserStatusSerializer
    permission_classes = [IsManagerOrAdmin]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response({'detail': 'امکان غیرفعال‌سازی حساب جاری وجود ندارد.'}, status=status.HTTP_400_BAD_REQUEST)
        response = super().patch(request, *args, **kwargs)
        return Response(
            {
                'message': 'وضعیت حساب با موفقیت به‌روزرسانی شد.',
                'user': UserSerializer(self.get_object()).data,
            },
            status=response.status_code,
        )


class UserRoleUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRoleUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        if request.user.role != UserRole.ADMIN:
            return Response({'detail': 'فقط ادمین می‌تواند نقش کاربران را تغییر دهد.'}, status=status.HTTP_403_FORBIDDEN)

        instance = self.get_object()
        if instance.role == UserRole.ADMIN:
            return Response({'detail': 'نقش ادمین قابل تغییر نیست.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'نقش کاربر با موفقیت به‌روزرسانی شد.',
                'user': UserSerializer(user).data,
            }
        )


class AdminPasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != UserRole.ADMIN:
            return Response({'detail': 'فقط ادمین می‌تواند گذرواژه ادمین را تغییر دهد.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminPasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        access_token, refresh_token = create_token_pair_for_user(user)
        response = Response(
            {
                'message': 'گذرواژه ادمین با موفقیت تغییر کرد.',
                'user': AuthUserSerializer(user).data,
            }
        )
        return set_auth_cookies(response, request, access_token, refresh_token)
