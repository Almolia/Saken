from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class RequestStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    ASSIGNED = "Assigned", "Assigned"
    COMPLETED = "Completed", "Completed"

class ServiceRequest(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING
    )
    resident = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='service_requests')
    assigned_staff = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_tasks')
    work_report = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.title