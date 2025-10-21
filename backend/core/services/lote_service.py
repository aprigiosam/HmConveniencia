"""
Serviço para gerenciar lotes e baixa de estoque com FEFO
(First Expired, First Out - Primeiro que Vence, Primeiro que Sai)
"""
from decimal import Decimal
from django.db import transaction
from ..models import Lote, Produto
import logging

logger = logging.getLogger(__name__)


class LoteService:
    """Serviço para gestão de lotes com estratégia FEFO"""

    @staticmethod
    def baixar_estoque_fefo(produto, quantidade_vendida):
        """
        Baixa estoque do produto usando estratégia FEFO.
        Vende primeiro dos lotes com vencimento mais próximo.

        Args:
            produto: Instância do Produto
            quantidade_vendida: Decimal - quantidade a ser baixada

        Returns:
            list: Lista de dicts com informações dos lotes afetados
            [{'lote_id': X, 'quantidade': Y, 'numero_lote': 'ABC'}]

        Raises:
            ValueError: Se não houver estoque suficiente
        """
        quantidade_vendida = Decimal(str(quantidade_vendida))

        # Busca lotes ativos do produto ordenados por FEFO
        # (data_validade primeiro, depois data_entrada)
        lotes_disponiveis = Lote.objects.filter(
            produto=produto,
            ativo=True,
            quantidade__gt=0
        ).order_by('data_validade', 'data_entrada')

        # Verifica se há estoque suficiente
        estoque_total = sum(lote.quantidade for lote in lotes_disponiveis)
        if estoque_total < quantidade_vendida:
            raise ValueError(
                f'Estoque insuficiente para {produto.nome}. '
                f'Disponível: {estoque_total}, Solicitado: {quantidade_vendida}'
            )

        quantidade_restante = quantidade_vendida
        lotes_afetados = []

        with transaction.atomic():
            for lote in lotes_disponiveis:
                if quantidade_restante <= 0:
                    break

                # Quantidade a ser retirada deste lote
                quantidade_deste_lote = min(lote.quantidade, quantidade_restante)

                # Baixa do lote
                lote.quantidade -= quantidade_deste_lote
                lote.save(update_fields=['quantidade', 'updated_at'])

                # Desativa se zerou
                if lote.quantidade == 0:
                    lote.ativo = False
                    lote.save(update_fields=['ativo', 'updated_at'])

                # Registra lote afetado
                lotes_afetados.append({
                    'lote_id': lote.id,
                    'numero_lote': lote.numero_lote or f'Lote #{lote.id}',
                    'quantidade': float(quantidade_deste_lote),
                    'data_validade': lote.data_validade.isoformat() if lote.data_validade else None,
                })

                quantidade_restante -= quantidade_deste_lote

                logger.info(
                    f'FEFO: Lote {lote.id} do produto {produto.nome} '
                    f'teve baixa de {quantidade_deste_lote} un. '
                    f'Restante no lote: {lote.quantidade}'
                )

            # Atualiza estoque total do produto
            produto.estoque -= quantidade_vendida
            produto.save(update_fields=['estoque', 'updated_at'])

            logger.info(
                f'FEFO: Total baixado de {produto.nome}: {quantidade_vendida} un. '
                f'Lotes afetados: {len(lotes_afetados)}'
            )

        return lotes_afetados

    @staticmethod
    def verificar_estoque_disponivel(produto):
        """
        Verifica estoque disponível do produto somando lotes ativos.

        Args:
            produto: Instância do Produto

        Returns:
            Decimal: Estoque total disponível
        """
        from django.db.models import Sum

        total = Lote.objects.filter(
            produto=produto,
            ativo=True
        ).aggregate(total=Sum('quantidade'))['total']

        return total or Decimal('0.00')

    @staticmethod
    def obter_proximo_lote_vencer(produto):
        """
        Retorna o próximo lote a vencer do produto.

        Args:
            produto: Instância do Produto

        Returns:
            Lote ou None
        """
        return Lote.objects.filter(
            produto=produto,
            ativo=True,
            data_validade__isnull=False
        ).order_by('data_validade', 'data_entrada').first()

    @staticmethod
    def adicionar_lote(produto_id, quantidade, data_validade=None,
                       numero_lote='', fornecedor='', preco_custo_lote=None,
                       observacoes=''):
        """
        Adiciona um novo lote ao estoque (entrada de mercadoria).

        Args:
            produto_id: ID do produto
            quantidade: Quantidade do lote
            data_validade: Data de validade (opcional)
            numero_lote: Número do lote (opcional)
            fornecedor: Nome do fornecedor (opcional)
            preco_custo_lote: Preço de custo específico do lote (opcional)
            observacoes: Observações (opcional)

        Returns:
            Lote: Instância do lote criado

        Raises:
            ValueError: Se produto não existir ou quantidade inválida
        """
        try:
            produto = Produto.objects.get(id=produto_id)
        except Produto.DoesNotExist:
            raise ValueError(f'Produto com ID {produto_id} não encontrado')

        quantidade = Decimal(str(quantidade))
        if quantidade <= 0:
            raise ValueError('Quantidade deve ser maior que zero')

        with transaction.atomic():
            # Cria o lote
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=numero_lote,
                quantidade=quantidade,
                data_validade=data_validade,
                fornecedor=fornecedor,
                preco_custo_lote=Decimal(str(preco_custo_lote)) if preco_custo_lote else None,
                observacoes=observacoes,
                ativo=True
            )

            # Atualiza estoque do produto
            produto.estoque += quantidade
            produto.save(update_fields=['estoque', 'updated_at'])

            logger.info(
                f'Lote criado: {lote.id} para produto {produto.nome} '
                f'com {quantidade} unidades'
            )

        return lote

    @staticmethod
    def produto_usa_lotes(produto):
        """
        Verifica se o produto usa sistema de lotes.
        Produtos SEM data_validade E sem lotes cadastrados não usam lotes.

        Args:
            produto: Instância do Produto

        Returns:
            bool: True se usa lotes, False caso contrário
        """
        # Se tem lotes ativos, usa lotes
        if produto.lotes.filter(ativo=True).exists():
            return True

        # Se tem data_validade mas não tem lotes, deveria usar lotes
        # (provavelmente está em transição)
        if produto.data_validade:
            return True

        # Produto sem validade e sem lotes = não usa lotes
        return False
