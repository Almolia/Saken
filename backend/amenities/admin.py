from django.contrib import admin
from .models import Amenity, Reservation


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ["name", "operating_rules", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "description"]
    ordering = ["name"]


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ["amenity", "resident", "start_time", "end_time", "status", "created_at"]
    list_filter = ["status", "amenity"]
    search_fields = ["amenity__name", "resident__full_name", "resident__phone"]
    ordering = ["-start_time"]
