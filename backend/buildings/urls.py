from django.urls import path
from .views import ManagerUnitListCreateView, MyUnitView

urlpatterns = [
    path('my-unit/', MyUnitView.as_view(), name='my-unit'),
    path('manager/units/', ManagerUnitListCreateView.as_view(), name='manager-units'),
]