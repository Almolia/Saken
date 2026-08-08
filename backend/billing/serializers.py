from decimal import Decimal

from rest_framework import serializers

from .models import MasterCharge, UnitCharge


class ResidentPendingChargeSerializer(serializers.ModelSerializer):
    """Payload for a resident's own pending bill.

    Flattens the related MasterCharge (title, description, due_date) together
    with the specific amount this unit owes. Exposed on a read-only, resident
    scoped endpoint only; residents can never create or edit their bills here.
    """

    title = serializers.CharField(source="master_charge.title", read_only=True)
    description = serializers.CharField(source="master_charge.description", read_only=True)
    due_date = serializers.DateField(source="master_charge.due_date", read_only=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = UnitCharge
        fields = [
            "id",
            "title",
            "description",
            "amount",
            "due_date",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]


class UnitChargeSerializer(serializers.ModelSerializer):
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    floor = serializers.IntegerField(source='unit.floor', read_only=True)
    unit_id = serializers.IntegerField(source='unit.id', read_only=True)

    class Meta:
        model = UnitCharge
        fields = [
            'id',
            'unit_id',
            'unit_number',
            'floor',
            'amount',
            'status',
            'created_at',
        ]


class MasterChargeSerializer(serializers.ModelSerializer):
    amount_per_unit = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )
    unit_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
    )
    unit_charges = UnitChargeSerializer(many=True, read_only=True)
    units_count = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = MasterCharge
        fields = [
            'id',
            'title',
            'description',
            'amount_per_unit',
            'amount',
            'due_date',
            'apply_to_all',
            'unit_ids',
            'unit_charges',
            'units_count',
            'total_units',
            'total_amount',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_units_count(self, obj):
        return obj.unit_charges.count()

    def get_total_units(self, obj):
        return obj.unit_charges.count()

    def get_total_amount(self, obj):
        count = obj.unit_charges.count()
        return str(Decimal(obj.amount_per_unit) * count)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['amount'] = str(instance.amount_per_unit)
        data['amount_per_unit'] = str(instance.amount_per_unit)
        return data

    def validate(self, attrs):
        title = (attrs.get('title') or '').strip()
        if not title:
            raise serializers.ValidationError({'title': 'عنوان شارژ الزامی است.'})

        amount_val = attrs.get('amount_per_unit')
        if amount_val is None:
            amount_val = attrs.get('amount')

        if amount_val is None:
            raise serializers.ValidationError({'amount': 'مبلغ شارژ الزامی است.'})

        try:
            dec_amount = Decimal(str(amount_val))
            if dec_amount <= 0:
                raise ValueError
        except Exception:
            raise serializers.ValidationError({'amount': 'مبلغ شارژ باید یک عدد بزرگ‌تر از صفر باشد.'})

        attrs['amount_per_unit'] = dec_amount

        due_date = attrs.get('due_date')
        if not due_date:
            raise serializers.ValidationError({'due_date': 'مهلت پرداخت الزامی است.'})

        apply_to_all = attrs.get('apply_to_all', True)
        unit_ids = attrs.get('unit_ids', [])
        if not apply_to_all and not unit_ids:
            raise serializers.ValidationError({'unit_ids': 'حداقل یک واحد باید انتخاب شود.'})

        return attrs


PeriodicChargeSerializer = MasterChargeSerializer


class ResidentPaymentSerializer(serializers.Serializer):
    charge_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )
