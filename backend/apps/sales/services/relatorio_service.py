"""
Serviço de geração de relatórios de sessão PDV
Relatórios X (parcial) e Z (fechamento)
"""

from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.utils import timezone
from typing import Dict, List, Any

from ..models import SessaoPDV, Venda, MovimentacaoCaixa, PagamentoVenda


class RelatorioService:
    """Serviço para geração de relatórios de PDV"""

    @staticmethod
    def gerar_relatorio_sessao(sessao: SessaoPDV, tipo: str = 'Z') -> Dict[str, Any]:
        """
        Gera relatório completo da sessão

        Args:
            sessao: Instância de SessaoPDV
            tipo: 'X' (parcial) ou 'Z' (fechamento)

        Returns:
            Dict com dados do relatório
        """

        # Informações da sessão
        info_sessao = {
            'codigo': sessao.codigo,
            'tipo': tipo,
            'loja': {
                'id': sessao.loja.id,
                'nome': sessao.loja.nome,
                'cnpj': getattr(sessao.loja, 'cnpj', ''),
                'endereco': getattr(sessao.loja, 'endereco', ''),
            },
            'responsavel': sessao.responsavel.username if sessao.responsavel else 'N/A',
            'aberta_em': sessao.aberta_em,
            'fechada_em': sessao.fechada_em,
            'status': sessao.status,
            'data_relatorio': timezone.now(),
        }

        # Vendas
        vendas = sessao.vendas.filter(status=Venda.Status.FINALIZADA)

        vendas_stats = vendas.aggregate(
            total_vendas=Sum('valor_total'),
            quantidade_vendas=Count('id'),
            total_descontos=Sum('valor_desconto'),
            total_subtotal=Sum('valor_subtotal'),
        )

        # Formas de pagamento
        pagamentos = PagamentoVenda.objects.filter(
            venda__sessao=sessao,
            venda__status=Venda.Status.FINALIZADA
        ).values(
            'forma_pagamento__nome'
        ).annotate(
            total=Sum('valor'),
            quantidade=Count('id')
        ).order_by('-total')

        formas_pagamento = [
            {
                'nome': p['forma_pagamento__nome'],
                'valor': float(p['total']),
                'quantidade': p['quantidade'],
            }
            for p in pagamentos
        ]

        # Movimentações de caixa
        movimentacoes = sessao.movimentacoes_caixa.all()

        sangrias = movimentacoes.filter(tipo='SANGRIA').aggregate(
            total=Sum('valor'),
            quantidade=Count('id')
        )

        reforcos = movimentacoes.filter(tipo='REFORCO').aggregate(
            total=Sum('valor'),
            quantidade=Count('id')
        )

        movimentacoes_resumo = {
            'sangrias': {
                'total': float(sangrias['total'] or 0),
                'quantidade': sangrias['quantidade'],
                'detalhes': list(movimentacoes.filter(tipo='SANGRIA').values(
                    'id', 'valor', 'motivo', 'data_hora', 'responsavel__username'
                ))
            },
            'reforcos': {
                'total': float(reforcos['total'] or 0),
                'quantidade': reforcos['quantidade'],
                'detalhes': list(movimentacoes.filter(tipo='REFORCO').values(
                    'id', 'valor', 'motivo', 'data_hora', 'responsavel__username'
                ))
            }
        }

        # Produtos mais vendidos
        from ..models import ItemVenda
        produtos_vendidos = ItemVenda.objects.filter(
            venda__sessao=sessao,
            venda__status=Venda.Status.FINALIZADA
        ).values(
            'produto__nome',
            'produto__sku'
        ).annotate(
            quantidade_total=Sum('quantidade'),
            valor_total=Sum('valor_total')
        ).order_by('-quantidade_total')[:10]

        top_produtos = [
            {
                'nome': p['produto__nome'],
                'sku': p['produto__sku'],
                'quantidade': float(p['quantidade_total']),
                'valor': float(p['valor_total']),
            }
            for p in produtos_vendidos
        ]

        # Cálculos de caixa
        saldo_inicial = float(sessao.saldo_inicial)
        total_vendas_valor = float(vendas_stats['total_vendas'] or 0)
        total_sangrias = float(sangrias['total'] or 0)
        total_reforcos = float(reforcos['total'] or 0)

        saldo_teorico = saldo_inicial + total_vendas_valor - total_sangrias + total_reforcos
        saldo_real = float(sessao.saldo_fechamento_real) if not sessao.esta_aberta else saldo_teorico
        diferenca = saldo_real - saldo_teorico if not sessao.esta_aberta else 0

        resumo_caixa = {
            'saldo_inicial': saldo_inicial,
            'total_vendas': total_vendas_valor,
            'total_sangrias': total_sangrias,
            'total_reforcos': total_reforcos,
            'saldo_teorico': saldo_teorico,
            'saldo_real': saldo_real,
            'diferenca': diferenca,
        }

        # Vendas canceladas
        vendas_canceladas = sessao.vendas.filter(status=Venda.Status.CANCELADA).count()

        # Monta relatório completo
        relatorio = {
            'sessao': info_sessao,
            'resumo': {
                'total_vendas': float(vendas_stats['total_vendas'] or 0),
                'quantidade_vendas': vendas_stats['quantidade_vendas'],
                'total_descontos': float(vendas_stats['total_descontos'] or 0),
                'ticket_medio': (
                    float(vendas_stats['total_vendas'] or 0) / vendas_stats['quantidade_vendas']
                    if vendas_stats['quantidade_vendas'] > 0
                    else 0
                ),
                'vendas_canceladas': vendas_canceladas,
            },
            'caixa': resumo_caixa,
            'formas_pagamento': formas_pagamento,
            'movimentacoes': movimentacoes_resumo,
            'top_produtos': top_produtos,
        }

        return relatorio

    @staticmethod
    def gerar_relatorio_x(sessao: SessaoPDV) -> Dict[str, Any]:
        """
        Gera relatório X (parcial) da sessão
        Não fecha a sessão, apenas consulta
        """
        if not sessao.esta_aberta:
            raise ValueError("Relatório X só pode ser gerado em sessões abertas")

        return RelatorioService.gerar_relatorio_sessao(sessao, tipo='X')

    @staticmethod
    def gerar_relatorio_z(sessao: SessaoPDV) -> Dict[str, Any]:
        """
        Gera relatório Z (fechamento) da sessão
        Deve ser gerado após o fechamento
        """
        if sessao.esta_aberta:
            raise ValueError("Relatório Z só pode ser gerado após fechamento da sessão")

        return RelatorioService.gerar_relatorio_sessao(sessao, tipo='Z')

    @staticmethod
    def validar_fechamento(sessao: SessaoPDV) -> Dict[str, Any]:
        """
        Valida se a sessão pode ser fechada
        Retorna avisos e bloqueios
        """
        avisos = []
        bloqueios = []
        pode_fechar = True

        # Verifica vendas pendentes
        vendas_pendentes = sessao.vendas.filter(status=Venda.Status.PENDENTE).count()
        if vendas_pendentes > 0:
            bloqueios.append(f"Existem {vendas_pendentes} venda(s) pendente(s)")
            pode_fechar = False

        # Verifica diferença de caixa grande
        if sessao.diferenca_caixa:
            diferenca_abs = abs(sessao.diferenca_caixa)
            if diferenca_abs > Decimal('50.00'):
                avisos.append(
                    f"Diferença de caixa alta: R$ {diferenca_abs:.2f}"
                )

        # Verifica se tem vendas
        if sessao.vendas.filter(status=Venda.Status.FINALIZADA).count() == 0:
            avisos.append("Nenhuma venda finalizada nesta sessão")

        # Verifica tempo de sessão
        if sessao.esta_aberta:
            duracao = timezone.now() - sessao.aberta_em
            if duracao.days > 0:
                avisos.append(f"Sessão aberta há {duracao.days} dia(s)")

        return {
            'pode_fechar': pode_fechar,
            'avisos': avisos,
            'bloqueios': bloqueios,
        }