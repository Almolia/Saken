from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class RequestStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    ASSIGNED = "Assigned", "Assigned"
    COMPLETED = "Completed", "Completed"

class PaymentMethod(models.TextChoices):
    """How a manager routes the cost of a completed service request."""
    EQUAL_SPLIT = "EQUAL_SPLIT", "Equal Split"
    REQUESTER_ONLY = "REQUESTER_ONLY", "Requester Only"
    BUILDING_WALLET = "BUILDING_WALLET", "Building Wallet"

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

    # Settlement: filled in once a manager routes the cost of a completed job.
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        null=True,
        blank=True,
    )
    is_settled = models.BooleanField(default=False)

    def __str__(self):
        return self.title