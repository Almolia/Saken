from django.urls import path
from .views import MyUnitView

urlpatterns = [
    path('my-unit/', MyUnitView.as_view(), name='my-unit'),
]