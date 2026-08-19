from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import UserMessages
from .models import User, UserRole
from .permissions import IsAdminUserRole, IsManagerOrAdmin, IsManagerRole, IsResident, IsServiceStaff
from .serializers import (
    AdminPasswordChangeSerializer,
    AdminProfileUpdateSerializer,
    AuthUserSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserRoleUpdateSerializer,
    UserStatusUpdateSerializer,
    UserSerializer,
)
from .services import build_auth_success_response, get_user_stats, logout_response


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
                "message": UserMessages.REGISTER_SUCCESS,
                "user": AuthUserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.LOGIN_SUCCESS,
        )


class LogoutView(APIView):
    def post(self, request):
        return logout_response(request)


class CurrentUserView(APIView):
    def get(self, request):
        if not request.user.is_active:
            return Response(
                {"detail": UserMessages.INACTIVE_ACCOUNT},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"user": AuthUserSerializer(request.user).data})


class UserListView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        users, stats = get_user_stats()
        return Response(
            {
                "stats": stats,
                "users": UserSerializer(users, many=True).data,
            }
        )


class UserStatusUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserStatusUpdateSerializer
    permission_classes = [IsAdminUserRole]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prevent lockout and preserve the break-glass administrator account.
        if instance.pk == request.user.pk:
            return Response({"detail": UserMessages.SELF_STATUS_IMMUTABLE}, status=status.HTTP_400_BAD_REQUEST)
        if instance.role == UserRole.ADMIN:
            return Response({"detail": UserMessages.ADMIN_STATUS_IMMUTABLE}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"message": UserMessages.ACCOUNT_STATUS_UPDATED, "user": UserSerializer(user).data})


class UserRoleUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRoleUpdateSerializer
    permission_classes = [IsManagerOrAdmin]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.role == UserRole.ADMIN:
            return Response(
                {"detail": UserMessages.ADMIN_ROLE_IMMUTABLE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if instance.pk == request.user.pk:
            return Response(
                {"detail": UserMessages.SELF_ROLE_IMMUTABLE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": UserMessages.ROLE_UPDATED,
                "user": UserSerializer(user).data,
            }
        )


class AdminProfileUpdateView(APIView):
    permission_classes = [IsAdminUserRole]

    def patch(self, request):
        serializer = AdminProfileUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.ADMIN_PROFILE_UPDATED,
        )


class AdminPasswordChangeView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        serializer = AdminPasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.ADMIN_PASSWORD_CHANGED,
        )


class ServiceStaffProfileUpdateView(APIView):
    permission_classes = [IsServiceStaff]

    def patch(self, request):
        serializer = AdminProfileUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.PROFILE_UPDATED,
        )


class ServiceStaffPasswordChangeView(APIView):
    permission_classes = [IsServiceStaff]

    def post(self, request):
        serializer = AdminPasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.PASSWORD_CHANGED,
        )


class ResidentProfileUpdateView(APIView):
    permission_classes = [IsResident]

    def patch(self, request):
        serializer = AdminProfileUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.PROFILE_UPDATED,
        )


class ResidentPasswordChangeView(APIView):
    permission_classes = [IsResident]

    def post(self, request):
        serializer = AdminPasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.PASSWORD_CHANGED,
        )


class ManagerProfileUpdateView(APIView):
    permission_classes = [IsManagerRole]

    def patch(self, request):
        serializer = AdminProfileUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.PROFILE_UPDATED,
        )


class ManagerPasswordChangeView(APIView):
    permission_classes = [IsManagerRole]

    def post(self, request):
        serializer = AdminPasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_success_response(
            request=request,
            user=user,
            message=UserMessages.PASSWORD_CHANGED,
        )


class ServiceStaffListView(APIView):
    """Returns all active users with the service_staff role for assignment dropdowns."""
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        staff = User.objects.filter(role=UserRole.SERVICE_STAFF, is_active=True).order_by('full_name')
        return Response({
            'staff': UserSerializer(staff, many=True).data,
        })
