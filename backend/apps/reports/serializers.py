from rest_framework import serializers

from .models import ReportJob


class ReportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportJob
        fields = [
            "id",
            "loja",
            "tipo",
            "parametros",
            "status",
            "payload",
            "mensagem",
            "created_at",
            "updated_at",
            "concluido_em",
        ]
        read_only_fields = [
            "status",
            "payload",
            "mensagem",
            "created_at",
            "updated_at",
            "concluido_em",
        ]


class ReportJobCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportJob
        fields = ["loja", "tipo", "parametros"]

    def create(self, validated_data):
        return ReportJob.objects.create(**validated_data)
