from django.urls import path
from .views import ManagerUnitAssignView, ManagerUnitListCreateView, MyUnitView

urlpatterns = [
    path('my-unit/', MyUnitView.as_view(), name='my-unit'),
    path('manager/units/', ManagerUnitListCreateView.as_view(), name='manager-units'),
    path('manager/units/<int:pk>/assign/', ManagerUnitAssignView.as_view(), name='manager-unit-assign'),
]