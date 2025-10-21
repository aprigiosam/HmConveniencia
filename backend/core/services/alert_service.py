"""
Serviço de Detecção e Criação de Alertas
"""

from datetime import date, timedelta
from django.utils import timezone
from core.models import Alerta, Cliente, Produto, Venda, Caixa


class AlertService:
    """Serviço para detectar e criar alertas do sistema"""

    @staticmethod
    def criar_alerta(tipo, prioridade, titulo, mensagem, **kwargs):
        """
        Cria um alerta se não existir um similar não resolvido
        Retorna: (alerta, created)
        """
        # Evita duplicação: verifica se já existe alerta similar não resolvido nas últimas 24h
        ultimas_24h = timezone.now() - timedelta(hours=24)

        filtro = {"tipo": tipo, "resolvido": False, "created_at__gte": ultimas_24h}

        # Adiciona filtros específicos se fornecidos
        if kwargs.get("cliente"):
            filtro["cliente"] = kwargs["cliente"]
        if kwargs.get("produto"):
            filtro["produto"] = kwargs["produto"]
        if kwargs.get("venda"):
            filtro["venda"] = kwargs["venda"]
        if kwargs.get("caixa"):
            filtro["caixa"] = kwargs["caixa"]
        if kwargs.get("lote"):
            filtro["lote"] = kwargs["lote"]

        alerta_existente = Alerta.objects.filter(**filtro).first()

        if alerta_existente:
            return alerta_existente, False

        # Cria novo alerta
        alerta = Alerta.objects.create(
            tipo=tipo,
            prioridade=prioridade,
            titulo=titulo,
            mensagem=mensagem,
            cliente=kwargs.get("cliente"),
            produto=kwargs.get("produto"),
            venda=kwargs.get("venda"),
            caixa=kwargs.get("caixa"),
            lote=kwargs.get("lote"),
        )

        return alerta, True

    @classmethod
    def verificar_limite_credito(cls):
        """
        Verifica clientes que estão usando >80% do limite de crédito
        Retorna: lista de alertas criados
        """
        alertas_criados = []

        clientes_ativos = Cliente.objects.filter(ativo=True, limite_credito__gt=0)

        for cliente in clientes_ativos:
            saldo = cliente.saldo_devedor()
            limite = cliente.limite_credito

            if saldo == 0:
                continue

            percentual = (saldo / limite) * 100

            # Alerta CRÍTICO: >90%
            if percentual > 90:
                titulo = f"🔴 {cliente.nome} - Limite Crítico ({percentual:.0f}%)"
                mensagem = (
                    f"Cliente está usando {percentual:.1f}% do limite de crédito!\n"
                    f"Limite: R$ {limite:.2f}\n"
                    f"Deve: R$ {saldo:.2f}\n"
                    f"Disponível: R$ {(limite - saldo):.2f}"
                )
                alerta, created = cls.criar_alerta(
                    tipo="LIMITE_CREDITO",
                    prioridade="CRITICA",
                    titulo=titulo,
                    mensagem=mensagem,
                    cliente=cliente,
                )
                if created:
                    alertas_criados.append(alerta)

            # Alerta ALTA: >80%
            elif percentual > 80:
                titulo = f"⚠️ {cliente.nome} - Limite Alto ({percentual:.0f}%)"
                mensagem = (
                    f"Cliente está usando {percentual:.1f}% do limite de crédito.\n"
                    f"Limite: R$ {limite:.2f}\n"
                    f"Deve: R$ {saldo:.2f}\n"
                    f"Disponível: R$ {(limite - saldo):.2f}"
                )
                alerta, created = cls.criar_alerta(
                    tipo="LIMITE_CREDITO",
                    prioridade="ALTA",
                    titulo=titulo,
                    mensagem=mensagem,
                    cliente=cliente,
                )
                if created:
                    alertas_criados.append(alerta)

        return alertas_criados

    @classmethod
    def verificar_produtos_vencendo(cls):
        """
        Verifica LOTES que vencerão nos próximos 3 dias
        Retorna: lista de alertas criados
        """
        from ..models import Lote

        alertas_criados = []

        hoje = date.today()
        daqui_3_dias = hoje + timedelta(days=3)

        # Busca lotes ativos que vencerão nos próximos 3 dias
        lotes = Lote.objects.filter(
            ativo=True,
            data_validade__isnull=False,
            data_validade__lte=daqui_3_dias,
            data_validade__gt=hoje,
        ).select_related("produto")

        for lote in lotes:
            dias = (lote.data_validade - hoje).days
            produto = lote.produto

            lote_info = (
                f"Lote {lote.numero_lote}" if lote.numero_lote else f"Lote #{lote.id}"
            )

            titulo = f"📅 {produto.nome} - {lote_info} vence em {dias} dia(s)"
            mensagem = (
                f"Lote vence em {lote.data_validade.strftime('%d/%m/%Y')}\n"
                f"{lote_info}\n"
                f"Quantidade: {lote.quantidade} un\n"
                f"Produto: {produto.nome}\n"
                f"Categoria: {produto.categoria.nome if produto.categoria else 'Sem categoria'}"
            )

            prioridade = "CRITICA" if dias <= 1 else "ALTA"

            alerta, created = cls.criar_alerta(
                tipo="PRODUTO_VENCENDO",
                prioridade=prioridade,
                titulo=titulo,
                mensagem=mensagem,
                produto=produto,
                lote=lote,
            )
            if created:
                alertas_criados.append(alerta)

        return alertas_criados

    @classmethod
    def verificar_produtos_vencidos(cls):
        """
        Verifica LOTES já vencidos
        Retorna: lista de alertas criados
        """
        from ..models import Lote

        alertas_criados = []

        hoje = date.today()

        # Busca lotes ativos que já venceram
        lotes = Lote.objects.filter(
            ativo=True, data_validade__isnull=False, data_validade__lt=hoje
        ).select_related("produto")

        for lote in lotes:
            dias_vencido = (hoje - lote.data_validade).days
            produto = lote.produto

            lote_info = (
                f"Lote {lote.numero_lote}" if lote.numero_lote else f"Lote #{lote.id}"
            )

            titulo = f"❌ {produto.nome} - {lote_info} VENCIDO há {dias_vencido} dia(s)"
            mensagem = (
                f"Lote venceu em {lote.data_validade.strftime('%d/%m/%Y')}\n"
                f"{lote_info}\n"
                f"Quantidade: {lote.quantidade} un\n"
                f"Produto: {produto.nome}\n"
                f"⚠️ REMOVER DO ESTOQUE IMEDIATAMENTE"
            )

            alerta, created = cls.criar_alerta(
                tipo="PRODUTO_VENCIDO",
                prioridade="CRITICA",
                titulo=titulo,
                mensagem=mensagem,
                produto=produto,
                lote=lote,
            )
            if created:
                alertas_criados.append(alerta)

        return alertas_criados

    @classmethod
    def verificar_estoque_baixo(cls):
        """
        Verifica produtos com estoque < 10
        Retorna: lista de alertas criados
        """
        alertas_criados = []

        produtos = Produto.objects.filter(ativo=True, estoque__lt=10, estoque__gt=0)

        for produto in produtos:
            titulo = f"📦 {produto.nome} - Estoque Baixo ({produto.estoque})"
            mensagem = (
                f"Estoque atual: {produto.estoque} unidade(s)\n"
                f"Preço: R$ {produto.preco:.2f}\n"
                f"Categoria: {produto.categoria.nome if produto.categoria else 'Sem categoria'}"
            )

            prioridade = "ALTA" if produto.estoque <= 3 else "MEDIA"

            alerta, created = cls.criar_alerta(
                tipo="ESTOQUE_BAIXO",
                prioridade=prioridade,
                titulo=titulo,
                mensagem=mensagem,
                produto=produto,
            )
            if created:
                alertas_criados.append(alerta)

        return alertas_criados

    @classmethod
    def verificar_estoque_zerado(cls):
        """
        Verifica produtos sem estoque
        Retorna: lista de alertas criados
        """
        alertas_criados = []

        produtos = Produto.objects.filter(ativo=True, estoque=0)

        for produto in produtos:
            titulo = f"🚫 {produto.nome} - SEM ESTOQUE"
            mensagem = (
                f"Produto sem estoque disponível!\n"
                f"Preço: R$ {produto.preco:.2f}\n"
                f"Categoria: {produto.categoria.nome if produto.categoria else 'Sem categoria'}"
            )

            alerta, created = cls.criar_alerta(
                tipo="ESTOQUE_ZERADO",
                prioridade="ALTA",
                titulo=titulo,
                mensagem=mensagem,
                produto=produto,
            )
            if created:
                alertas_criados.append(alerta)

        return alertas_criados

    @classmethod
    def verificar_contas_vencidas(cls):
        """
        Verifica vendas fiado vencidas há mais de 7 dias
        Retorna: lista de alertas criados
        """
        alertas_criados = []

        hoje = date.today()
        limite = hoje - timedelta(days=7)

        vendas = Venda.objects.filter(
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            forma_pagamento="FIADO",
            data_vencimento__isnull=False,
            data_vencimento__lt=limite,
        ).select_related("cliente")

        for venda in vendas:
            dias_atraso = (hoje - venda.data_vencimento).days

            titulo = f"💰 Conta vencida - {venda.cliente.nome if venda.cliente else 'Cliente não informado'}"
            mensagem = (
                f"Venda #{venda.numero}\n"
                f"Vencimento: {venda.data_vencimento.strftime('%d/%m/%Y')}\n"
                f"Atraso: {dias_atraso} dia(s)\n"
                f"Valor: R$ {venda.total:.2f}\n"
                f"Cliente: {venda.cliente.nome if venda.cliente else 'N/A'}\n"
                f"Telefone: {venda.cliente.telefone if venda.cliente else 'N/A'}"
            )

            # Quanto mais atrasado, maior a prioridade
            if dias_atraso > 30:
                prioridade = "CRITICA"
            elif dias_atraso > 15:
                prioridade = "ALTA"
            else:
                prioridade = "MEDIA"

            alerta, created = cls.criar_alerta(
                tipo="CONTA_VENCIDA",
                prioridade=prioridade,
                titulo=titulo,
                mensagem=mensagem,
                venda=venda,
                cliente=venda.cliente,
            )
            if created:
                alertas_criados.append(alerta)

        return alertas_criados

    @classmethod
    def verificar_diferenca_caixa(cls):
        """
        Verifica caixas fechados com diferença > R$ 50
        (Apenas últimos 7 dias)
        Retorna: lista de alertas criados
        """
        alertas_criados = []

        limite_data = timezone.now() - timedelta(days=7)

        caixas = Caixa.objects.filter(
            status="FECHADO", data_fechamento__gte=limite_data, diferenca__isnull=False
        )

        for caixa in caixas:
            diferenca_abs = abs(caixa.diferenca)

            if diferenca_abs > 50:
                sinal = "+" if caixa.diferenca > 0 else "-"
                titulo = f"💵 Diferença de Caixa - {sinal}R$ {diferenca_abs:.2f}"
                mensagem = (
                    f"Caixa do dia {caixa.data_abertura.strftime('%d/%m/%Y')}\n"
                    f"Valor Sistema: R$ {caixa.valor_final_sistema:.2f}\n"
                    f"Valor Informado: R$ {caixa.valor_final_informado:.2f}\n"
                    f"Diferença: {sinal}R$ {diferenca_abs:.2f}\n"
                    f"Observações: {caixa.observacoes or 'Nenhuma'}"
                )

                # Diferença grande = prioridade alta
                prioridade = "CRITICA" if diferenca_abs > 100 else "ALTA"

                alerta, created = cls.criar_alerta(
                    tipo="DIFERENCA_CAIXA",
                    prioridade=prioridade,
                    titulo=titulo,
                    mensagem=mensagem,
                    caixa=caixa,
                )
                if created:
                    alertas_criados.append(alerta)

        return alertas_criados

    @classmethod
    def verificar_todos(cls):
        """
        Executa todas as verificações de alertas
        Retorna: dict com estatísticas
        """
        resultado = {
            "limite_credito": cls.verificar_limite_credito(),
            "produtos_vencendo": cls.verificar_produtos_vencendo(),
            "produtos_vencidos": cls.verificar_produtos_vencidos(),
            "estoque_baixo": cls.verificar_estoque_baixo(),
            "estoque_zerado": cls.verificar_estoque_zerado(),
            "contas_vencidas": cls.verificar_contas_vencidas(),
            "diferenca_caixa": cls.verificar_diferenca_caixa(),
        }

        total_criados = sum(len(alertas) for alertas in resultado.values())

        return {"total_criados": total_criados, "detalhes": resultado}

    @staticmethod
    def obter_resumo():
        """
        Retorna resumo de alertas não resolvidos
        """
        alertas_pendentes = Alerta.objects.filter(resolvido=False)

        return {
            "total_pendentes": alertas_pendentes.count(),
            "nao_lidos": alertas_pendentes.filter(lido=False).count(),
            "criticos": alertas_pendentes.filter(prioridade="CRITICA").count(),
            "altos": alertas_pendentes.filter(prioridade="ALTA").count(),
            "medios": alertas_pendentes.filter(prioridade="MEDIA").count(),
            "baixos": alertas_pendentes.filter(prioridade="BAIXA").count(),
        }
