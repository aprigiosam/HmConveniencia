from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import Loja, TimeStampedModel


class ReportJob(TimeStampedModel):
    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", _("Pendente")
        PROCESSANDO = "PROCESSANDO", _("Processando")
        CONCLUIDO = "CONCLUIDO", _("Concluído")
        ERRO = "ERRO", _("Erro")

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="report_jobs", null=True, blank=True)
    tipo = models.CharField(max_length=100)
    parametros = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    payload = models.JSONField(default=dict, blank=True)
    mensagem = models.TextField(blank=True)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.get_status_display()} - {self.tipo}"
