from rest_framework import serializers
from buildings.models import Unit
from buildings.serializers import ManagerUnitSerializer
from .models import PeriodicCharge


class PeriodicChargeSerializer(serializers.ModelSerializer):
    unit_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Unit.objects.all(),
        source='units',
        required=False,
    )
    units = ManagerUnitSerializer(many=True, read_only=True)
    units_count = serializers.SerializerMethodField()

    class Meta:
        model = PeriodicCharge
        fields = [
            'id',
            'title',
            'description',
            'amount',
            'due_date',
            'apply_to_all',
            'units',
            'unit_ids',
            'units_count',
            'created_at',
        ]

    def get_units_count(self, obj):
        if obj.apply_to_all:
            return Unit.objects.count()
        return obj.units.count()

    def validate(self, attrs):
        title = (attrs.get('title') or '').strip()
        if not title:
            raise serializers.ValidationError({'title': 'عنوان شارژ الزامی است.'})

        amount = attrs.get('amount')
        if amount is None or amount <= 0:
            raise serializers.ValidationError({'amount': 'مبلغ شارژ باید بزرگ‌تر از صفر باشد.'})

        due_date = attrs.get('due_date')
        if not due_date:
            raise serializers.ValidationError({'due_date': 'مهلت پرداخت الزامی است.'})

        apply_to_all = attrs.get('apply_to_all', True)
        units = attrs.get('units', [])
        if not apply_to_all and not units:
            raise serializers.ValidationError({'units': 'حداقل یک واحد باید انتخاب شود.'})

        return attrs
