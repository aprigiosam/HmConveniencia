from celery import shared_task

from .models import NotaFiscal
from .services import simular_autorizacao


@shared_task
def processar_nfe(nota_id: int) -> None:
    nota = NotaFiscal.objects.get(pk=nota_id)
    simular_autorizacao(nota)
