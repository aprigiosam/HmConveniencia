"""
Signals para manter consistência entre Lotes e Produtos
"""
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from .models import Lote
import logging

logger = logging.getLogger(__name__)


@receiver(post_delete, sender=Lote)
def atualizar_estoque_ao_deletar_lote(sender, instance, **kwargs):
    """
    Quando um lote é deletado, atualiza o estoque do produto.
    """
    produto = instance.produto
    quantidade_removida = instance.quantidade

    # Atualiza estoque do produto
    produto.estoque -= quantidade_removida
    if produto.estoque < 0:
        produto.estoque = 0
    produto.save(update_fields=['estoque'])

    logger.info(
        f'Lote {instance.id} deletado. Estoque de {produto.nome} '
        f'reduzido em {quantidade_removida} un. Novo estoque: {produto.estoque}'
    )


@receiver(pre_save, sender=Lote)
def atualizar_estoque_ao_editar_lote(sender, instance, **kwargs):
    """
    Quando a quantidade de um lote é editada, atualiza o estoque do produto.
    """
    if instance.pk:  # Se está editando (não é novo)
        try:
            lote_antigo = Lote.objects.get(pk=instance.pk)
            diferenca = instance.quantidade - lote_antigo.quantidade

            if diferenca != 0:
                produto = instance.produto
                produto.estoque += diferenca
                produto.save(update_fields=['estoque'])

                logger.info(
                    f'Lote {instance.id} editado. Estoque de {produto.nome} '
                    f'ajustado em {diferenca:+.2f} un. Novo estoque: {produto.estoque}'
                )
        except Lote.DoesNotExist:
            pass
