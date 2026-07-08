from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("users.api_urls")),
    path("api/", include('buildings.urls')),
]
