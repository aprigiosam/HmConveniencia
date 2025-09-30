from __future__ import annotations

from decimal import Decimal
from typing import Iterable

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalog.models import LoteProduto
from apps.core.models import Loja
from apps.inventory.models import MovimentacaoEstoque

from ..models import ItemVenda, SessaoPDV, Venda


def _normalizar_quantidade(item: ItemVenda) -> int:
    quantidade = item.quantidade or Decimal("0")
    if quantidade <= 0:
        raise ValidationError(f"Quantidade inválida para o item {item.produto.nome}.")
    if quantidade % 1 != 0:
        raise ValidationError(
            f"Quantidade fracionada não suportada para o produto {item.produto.nome}."
        )
    return int(quantidade)


def _registrar_movimentacao(
    *,
    venda: Venda,
    item: ItemVenda,
    lote: LoteProduto,
    quantidade_anterior: int,
    quantidade_baixada: int,
) -> None:
    MovimentacaoEstoque.objects.create(
        loja=venda.loja,
        produto=item.produto,
        lote=lote,
        tipo=MovimentacaoEstoque.Tipo.SAIDA,
        quantidade=Decimal(quantidade_baixada),
        quantidade_anterior=Decimal(quantidade_anterior),
        motivo=f"Venda {venda.numero_venda}",
        observacoes="Baixa automática pela finalização da venda",
    )


def _celeridade_ordem() -> Iterable[F]:
    return (F("data_vencimento").asc(nulls_last=True), F("id").asc())


def _obter_lotes(venda: Venda, item: ItemVenda) -> Iterable[LoteProduto]:
    if item.lote_id:
        # Se tem lote específico, buscar apenas esse lote (independente da loja para validação posterior)
        return LoteProduto.objects.select_for_update().filter(
            produto=item.produto,
            pk=item.lote_id
        )

    # Se não tem lote específico, buscar lotes da mesma loja com estoque
    return LoteProduto.objects.select_for_update().filter(
        produto=item.produto,
        loja=venda.loja,
        quantidade__gt=0
    ).order_by(*_celeridade_ordem())


def _baixar_do_lote(
    *,
    venda: Venda,
    item: ItemVenda,
    lote: LoteProduto,
    quantidade_restante: int,
) -> int:
    if lote.produto_id != item.produto_id:
        raise ValidationError(
            f"Lote {lote.numero_lote} não corresponde ao produto {item.produto.nome}."
        )
    if lote.loja_id != venda.loja_id:
        raise ValidationError(
            f"Lote {lote.numero_lote} não pertence à loja da venda."
        )

    disponivel = int(lote.quantidade)
    if disponivel <= 0:
        return quantidade_restante

    consumo = min(disponivel, quantidade_restante)
    if consumo == 0:
        return quantidade_restante

    quantidade_anterior = disponivel
    lote.quantidade = disponivel - consumo
    lote.save(update_fields=["quantidade"])

    _registrar_movimentacao(
        venda=venda,
        item=item,
        lote=lote,
        quantidade_anterior=quantidade_anterior,
        quantidade_baixada=consumo,
    )

    return quantidade_restante - consumo


def _baixar_estoque(venda: Venda) -> None:
    itens = venda.itens.select_related("produto", "lote")

    for item in itens:
        quantidade_solicitada = _normalizar_quantidade(item)
        lotes = list(_obter_lotes(venda, item))

        if not lotes:
            raise ValidationError(
                f"Produto {item.produto.nome} sem estoque disponível na loja {venda.loja.nome}."
            )

        restante = quantidade_solicitada
        for lote in lotes:
            restante = _baixar_do_lote(
                venda=venda,
                item=item,
                lote=lote,
                quantidade_restante=restante,
            )
            if restante == 0:
                break

        if restante > 0:
            raise ValidationError(
                f"Estoque insuficiente para {item.produto.nome}. Faltam {restante} unidades."
            )


@transaction.atomic
def finalizar_venda(venda: Venda, *, status_anterior: str | None = None) -> Venda:
    if not venda.pk:
        raise ValidationError("Venda inválida para finalização.")

    status_anterior = status_anterior or venda.status
    if status_anterior == Venda.Status.CANCELADA:
        raise ValidationError("Não é possível finalizar uma venda cancelada.")
    if status_anterior == Venda.Status.FINALIZADA:
        return venda

    venda_atualizada = (
        Venda.objects.select_for_update()
        .select_related("loja")
        .prefetch_related("itens__produto", "itens__lote")
        .get(pk=venda.pk)
    )

    venda_atualizada.calcular_total()
    _baixar_estoque(venda_atualizada)

    venda_atualizada.status = Venda.Status.FINALIZADA
    venda_atualizada.save(update_fields=["status", "updated_at"])
    return venda_atualizada


@transaction.atomic
def obter_ou_criar_sessao_aberta(
    loja: Loja,
    *,
    responsavel: object | None = None,
) -> SessaoPDV:
    """Retorna a sessão PDV ativa para a loja ou cria uma nova."""

    if not getattr(loja, "pk", None):  # pragma: no cover - guarda trivial
        raise ValidationError("Loja inválida para abertura de sessão")

    sessao = (
        SessaoPDV.objects.select_for_update()
        .filter(loja=loja, status=SessaoPDV.Status.ABERTA)
        .order_by("-aberta_em")
        .first()
    )
    if sessao:
        return sessao

    return SessaoPDV.objects.create(
        loja=loja,
        responsavel=responsavel,
        aberta_em=timezone.now(),
    )
