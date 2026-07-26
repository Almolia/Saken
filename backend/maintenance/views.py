from rest_framework import generics
from .models import ServiceRequest
from .serializers import ServiceRequestSerializer
from users.permissions import IsResident

class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsResident]

    def get_queryset(self):
        """Strictly filters and returns only the records where resident == request.user."""
        return ServiceRequest.objects.filter(resident=self.request.user)

    def perform_create(self, serializer):
        """Ensures the resident field is automatically set to the authenticated user."""
        serializer.save(resident=self.request.user)