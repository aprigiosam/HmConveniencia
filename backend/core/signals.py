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
    produto.save(update_fields=["estoque"])

    logger.info(
        f"Lote {instance.id} deletado. Estoque de {produto.nome} "
        f"reduzido em {quantidade_removida} un. Novo estoque: {produto.estoque}"
    )


@receiver(pre_save, sender=Lote)
def atualizar_estoque_ao_editar_lote(sender, instance, **kwargs):
    """
    Quando a quantidade de um lote é editada, atualiza o estoque do produto.
    """
    if instance.pk:  # Se está editando (não é novo)
        try:
            lote_antigo = Lote.objects.select_related("produto").get(pk=instance.pk)
            produto_original = lote_antigo.produto
            produto_atual = instance.produto

            if getattr(produto_atual, "id", None) is None:
                return

            if produto_original.id != produto_atual.id:
                # Remove quantidade antiga do produto original
                produto_original.estoque -= lote_antigo.quantidade
                if produto_original.estoque < 0:
                    produto_original.estoque = 0
                produto_original.save(update_fields=["estoque"])

                # Adiciona quantidade atual ao novo produto
                produto_atual.estoque += instance.quantidade
                produto_atual.save(update_fields=["estoque"])

                logger.info(
                    "Lote %s transferido do produto '%s' para '%s'. Estoques atualizados.",
                    instance.id,
                    produto_original.nome,
                    produto_atual.nome,
                )
            else:
                diferenca = instance.quantidade - lote_antigo.quantidade
                if diferenca != 0:
                    produto_atual.estoque += diferenca
                    produto_atual.save(update_fields=["estoque"])

                    logger.info(
                        f"Lote {instance.id} editado. Estoque de {produto_atual.nome} "
                        f"ajustado em {diferenca:+.2f} un. Novo estoque: {produto_atual.estoque}"
                    )
        except Lote.DoesNotExist:
            pass
