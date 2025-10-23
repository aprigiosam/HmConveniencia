"""
Views da API - HMConveniencia
"""

import logging
from django.core.management import call_command
from django.contrib.auth import authenticate
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Count, Q, OuterRef, Subquery
from django.utils import timezone
from django.db import connection, transaction
from datetime import timedelta
from decimal import Decimal
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.core.cache import cache
from fiscal.models import NotaFiscal, Empresa, EstoqueMovimento, EstoqueOrigem
from .models import (
    Cliente,
    Fornecedor,
    Produto,
    Venda,
    Caixa,
    Categoria,
    Alerta,
    Lote,
)
from .serializers import (
    ClienteSerializer,
    FornecedorSerializer,
    ProdutoSerializer,
    VendaSerializer,
    VendaCreateSerializer,
    CaixaSerializer,
    MovimentacaoCaixaSerializer,
    CategoriaSerializer,
    AlertaSerializer,
    LoteSerializer,
    OpenFoodFactsProductSerializer,
    InventarioSessaoSerializer,
    InventarioItemSerializer,
)
from .services.alert_service import AlertService
from .services import openfoodfacts
from .services.openfoodfacts import OpenFoodFactsError
from .models import InventarioSessao, InventarioItem

# Logger para operações críticas
logger = logging.getLogger(__name__)


class InventarioSessaoViewSet(viewsets.ModelViewSet):
    queryset = (
        InventarioSessao.objects.select_related("empresa")
        .prefetch_related("itens__produto")
        .all()
    )
    serializer_class = InventarioSessaoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        empresa_id = (
            self.request.query_params.get("empresa_id")
            or self.request.headers.get("X-Empresa-Id")
        )
        if empresa_id:
            return qs.filter(empresa_id=empresa_id)

        empresa = Empresa.objects.first()
        return qs.filter(empresa=empresa) if empresa else qs.none()

    def perform_create(self, serializer):
        serializer.save(empresa=self._obter_empresa())

    def perform_update(self, serializer):
        instancia = serializer.save()
        if instancia.status == "FINALIZADO" and instancia.finalizado_em is None:
            from django.utils import timezone

            instancia.finalizado_em = timezone.now()
            instancia.save(update_fields=["finalizado_em"])

    def perform_destroy(self, instance):
        """
        Deleta uma sessão de inventário.
        Se a sessão estiver finalizada, reverte os ajustes de estoque antes de deletar.
        """
        total_itens = instance.itens.count()

        with transaction.atomic():
            if instance.status == "FINALIZADO":
                logger.warning(
                    f"Revertendo ajustes de estoque da sessão finalizada {instance.titulo} "
                    f"(ID: {instance.id}) antes de excluir"
                )

                # Reverte os ajustes de estoque
                for item in instance.itens.select_related("produto"):
                    if item.produto and item.diferenca != 0:
                        # Reverte a diferença (faz o inverso do ajuste)
                        diferenca_reversa = -item.diferenca
                        produto = item.produto
                        produto.estoque = (produto.estoque or Decimal("0")) + diferenca_reversa
                        produto.save(update_fields=["estoque"])

                        logger.info(
                            f"Revertido ajuste de {item.diferenca} → {diferenca_reversa} "
                            f"no produto {produto.nome} (ID: {produto.id})"
                        )

                # Deleta os movimentos de estoque relacionados a esta sessão
                movimentos_deletados = EstoqueMovimento.objects.filter(
                    observacao__contains=f"Ajuste inventário {instance.titulo}"
                ).delete()

                logger.info(
                    f"Deletados {movimentos_deletados[0]} movimentos de estoque "
                    f"relacionados à sessão {instance.titulo}"
                )

            logger.info(
                f"Excluindo sessão de inventário {instance.titulo} "
                f"(ID: {instance.id}, Status: {instance.status}) com {total_itens} itens"
            )

            instance.delete()

    def _obter_empresa(self) -> Empresa:
        empresa_id = (
            self.request.data.get("empresa_id")
            or self.request.headers.get("X-Empresa-Id")
        )
        if empresa_id:
            return Empresa.objects.get(id=empresa_id)

        empresa = Empresa.objects.first()
        if not empresa:
            raise Empresa.DoesNotExist("Nenhuma empresa configurada.")
        return empresa

    @action(detail=True, methods=["post"], url_path="adicionar-item")
    def adicionar_item(self, request, *args, **kwargs):
        sessao = self.get_object()
        dados = request.data.copy()
        dados["sessao"] = str(sessao.id)

        try:
            produto = None
            produto_id = dados.get("produto") or dados.get("produto_id")
            if produto_id:
                try:
                    produto = Produto.objects.get(id=produto_id)
                except Produto.DoesNotExist:
                    return Response(
                        {"detail": "Produto informado não encontrado."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if produto and not dados.get("quantidade_sistema"):
                dados["quantidade_sistema"] = str(produto.estoque or Decimal("0"))

            if produto and not dados.get("descricao"):
                dados["descricao"] = produto.nome

            if produto and not dados.get("codigo_barras"):
                dados["codigo_barras"] = produto.codigo_barras or ""

            if not dados.get("descricao"):
                dados["descricao"] = dados.get("codigo_barras") or "Item inventário"

            serializer = InventarioItemSerializer(data=dados)
            serializer.is_valid(raise_exception=True)
            item = serializer.save()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Erro ao adicionar item ao inventário")
            return Response(
                {"detail": "Falha ao registrar item no inventário.", "error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            InventarioItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, *args, **kwargs):
        sessao = self.get_object()
        if sessao.status == "FINALIZADO":
            return Response(
                {"detail": "Essa sessão já está finalizada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone

        with transaction.atomic():
            for item in sessao.itens.select_related("produto"):
                diferenca = item.ajustar_produto()
                if diferenca and item.produto:
                    EstoqueMovimento.objects.create(
                        empresa=sessao.empresa,
                        produto=item.produto,
                        origem=EstoqueOrigem.AJUSTE,
                        quantidade=diferenca,
                        custo_unitario=(item.custo_informado or Decimal("0")),
                        observacao=f"Ajuste inventário {sessao.titulo}",
                    )

            sessao.status = "FINALIZADO"
            sessao.finalizado_em = timezone.now()
            sessao.save(update_fields=["status", "finalizado_em"])

        return Response(
            InventarioSessaoSerializer(sessao).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"itens/(?P<item_id>[^/.]+)",
    )
    def remover_item(self, request, item_id, *args, **kwargs):
        sessao = self.get_object()
        try:
            item = sessao.itens.get(id=item_id)
        except InventarioItem.DoesNotExist as exc:
            raise ValidationError("Item não encontrado na sessão.") from exc

        if sessao.status == "FINALIZADO":
            raise ValidationError("Itens de sessões finalizadas não podem ser removidos.")

        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoriaViewSet(viewsets.ModelViewSet):
    """ViewSet para Categorias de Produtos"""

    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtro por ativos
        ativo = self.request.query_params.get("ativo", None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == "true")
        return queryset


class BackupViewSet(viewsets.ViewSet):
    """ViewSet para acionar backups do banco de dados"""

    @action(detail=False, methods=["post"])
    @method_decorator(ratelimit(key="user", rate="1/m", method="POST", block=True))
    def trigger_backup(self, request):
        """Aciona o comando de backup do banco de dados - Rate limited: 1 backup por minuto"""
        try:
            call_command("backup_db")
            return Response(
                {"message": "Backup iniciado com sucesso!"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Erro ao iniciar backup: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ClienteViewSet(viewsets.ModelViewSet):
    """ViewSet para Clientes"""

    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por ativos
        ativo = self.request.query_params.get("ativo", None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == "true")

        # Busca por nome
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(nome__icontains=search)

        return queryset

    @action(detail=False, methods=["get"])
    def com_dividas(self, request):
        """Retorna clientes com vendas pendentes - Cache 5 minutos"""
        cache_key = "clientes_com_dividas"
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        # Otimizado: usa annotate em vez de N+1 queries
        clientes = (
            Cliente.objects.filter(
                vendas__status_pagamento="PENDENTE",
                vendas__status="FINALIZADA",
                ativo=True,
            )
            .annotate(
                total_divida=Sum("vendas__total"), qtd_vendas_pendentes=Count("vendas")
            )
            .distinct()
            .order_by("nome")
        )

        serializer = ClienteSerializer(clientes, many=True)
        data = serializer.data

        # Salva no cache por 5 minutos (300 segundos)
        cache.set(cache_key, data, 300)

        return Response(data)


class FornecedorViewSet(viewsets.ModelViewSet):
    """ViewSet para Fornecedores"""

    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por ativos
        ativo = self.request.query_params.get("ativo", None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == "true")

        # Busca por nome
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(nome__icontains=search)
                | Q(nome_fantasia__icontains=search)
                | Q(cnpj__icontains=search)
            )

        ultima_nf = NotaFiscal.objects.filter(fornecedor_id=OuterRef("pk")).order_by(
            "-data_emissao", "-created_at"
        )

        queryset = queryset.annotate(
            total_notas=Count("notas_fiscais", distinct=True),
            valor_notas=Sum("notas_fiscais__valor_total"),
            ultima_compra_data=Subquery(ultima_nf.values("data_emissao")[:1]),
            ultima_compra_valor=Subquery(ultima_nf.values("valor_total")[:1]),
            ultima_nota_chave=Subquery(ultima_nf.values("chave_acesso")[:1]),
        )

        return queryset.order_by("nome")

    @action(detail=True, methods=["get"])
    def lotes(self, request, pk=None):
        """Retorna todos os lotes de um fornecedor"""
        fornecedor = self.get_object()
        lotes = fornecedor.lotes.filter(ativo=True).select_related("produto")
        serializer = LoteSerializer(lotes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def estatisticas(self, request, pk=None):
        """Retorna estatísticas de compras do fornecedor"""
        fornecedor = self.get_object()

        lotes = fornecedor.lotes.filter(ativo=True)

        stats = {
            "total_lotes": lotes.count(),
            "total_compras": float(fornecedor.total_compras()),
            "total_produtos_diferentes": lotes.values("produto").distinct().count(),
            "quantidade_total": float(
                lotes.aggregate(total=Sum("quantidade"))["total"] or 0
            ),
            "ticket_medio": 0,
        }

        if stats["total_lotes"] > 0:
            stats["ticket_medio"] = stats["total_compras"] / stats["total_lotes"]

        return Response(stats)


class ProdutoViewSet(viewsets.ModelViewSet):
    """ViewSet para Produtos"""

    queryset = Produto.objects.select_related("categoria").all()
    serializer_class = ProdutoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por ativos
        ativo = self.request.query_params.get("ativo", None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == "true")

        # Busca por nome ou código (otimizada com Q)
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(nome__icontains=search) | Q(codigo_barras__icontains=search)
            )

        return queryset

    @action(detail=False, methods=["get"], url_path="buscar-openfood")
    def buscar_openfood(self, request):
        """Consulta o Open Food Facts por termo livre ou código de barras."""
        query = request.query_params.get("q", "").strip()
        code = request.query_params.get("code", "").strip()

        if not query and not code:
            return Response(
                {"detail": "Informe o parâmetro 'q' (termo) ou 'code' (GTIN)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if code:
                product = openfoodfacts.fetch_by_code(code)
                results = [product] if product else []
            else:
                try:
                    page = int(request.query_params.get("page", "1"))
                except ValueError:
                    page = 1
                try:
                    page_size = int(request.query_params.get("page_size", "10"))
                except ValueError:
                    page_size = 10
                results = openfoodfacts.search_products(
                    query, page=page, page_size=page_size
                )
        except OpenFoodFactsError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY
            )

        serializer = OpenFoodFactsProductSerializer(results, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def baixo_estoque(self, request):
        """Retorna produtos com estoque baixo (< 10) - Cache 5 minutos"""
        cache_key = "produtos_baixo_estoque"
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        produtos = self.queryset.filter(estoque__lt=10, ativo=True)
        serializer = ProdutoSerializer(produtos, many=True)
        data = serializer.data

        # Salva no cache por 5 minutos (300 segundos)
        cache.set(cache_key, data, 300)

        return Response(data)

    @action(detail=False, methods=["get"])
    def mais_lucrativos(self, request):
        """Retorna os produtos mais lucrativos - Cache 15 minutos"""
        from django.db.models import F
        from core.models import ItemVenda

        # Cache key
        cache_key = "produtos_mais_lucrativos"
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        # Agrega os dados de vendas por produto
        produtos_lucro = (
            ItemVenda.objects.filter(
                venda__status="FINALIZADA",
                produto__preco_custo__gt=0,  # Considera apenas produtos com custo definido
            )
            .values("produto__nome", "produto__preco", "produto__preco_custo")
            .annotate(
                total_vendido=Sum("quantidade"),
                receita_total=Sum(F("quantidade") * F("preco_unitario")),
                custo_total=Sum(F("quantidade") * F("produto__preco_custo")),
                lucro_total=Sum(
                    F("quantidade") * (F("preco_unitario") - F("produto__preco_custo"))
                ),
            )
            .order_by("-lucro_total")
        )

        # Formata a saída
        results = []
        for item in produtos_lucro:
            results.append(
                {
                    "nome_produto": item["produto__nome"],
                    "preco_venda": float(item["produto__preco"]),
                    "preco_custo": float(item["produto__preco_custo"]),
                    "total_vendido": float(item["total_vendido"]),
                    "receita_total": float(item["receita_total"]),
                    "custo_total": float(item["custo_total"]),
                    "lucro_total": float(item["lucro_total"]),
                }
            )

        # Salva no cache por 15 minutos (900 segundos)
        cache.set(cache_key, results, 900)

        return Response(results)


class VendaViewSet(viewsets.ModelViewSet):
    """ViewSet para Vendas"""

    queryset = (
        Venda.objects.select_related("cliente").prefetch_related("itens__produto").all()
    )

    def get_serializer_class(self):
        if self.action == "create":
            return VendaCreateSerializer
        return VendaSerializer

    @method_decorator(ratelimit(key="user", rate="30/m", block=True))
    def create(self, request, *args, **kwargs):
        """Cria nova venda - Rate limited: 30 vendas por minuto por usuário"""
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        venda = create_serializer.save()

        # Invalida caches relacionados
        self._invalidate_vendas_cache()

        read_serializer = VendaSerializer(venda)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    def _invalidate_vendas_cache(self):
        """Invalida todos os caches relacionados a vendas"""
        hoje = timezone.now().date()
        cache_keys = [
            f"dashboard_{hoje.isoformat()}",
            "produtos_mais_lucrativos",
            "clientes_com_dividas",
            "produtos_baixo_estoque",
        ]
        cache.delete_many(cache_keys)

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por status
        status_filter = self.request.query_params.get("status", None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filtro por data (hoje, esta semana, este mês)
        periodo = self.request.query_params.get("periodo", None)
        if periodo == "hoje":
            hoje = timezone.now().date()
            queryset = queryset.filter(created_at__date=hoje)
        elif periodo == "semana":
            inicio_semana = timezone.now() - timedelta(days=7)
            queryset = queryset.filter(created_at__gte=inicio_semana)
        elif periodo == "mes":
            inicio_mes = timezone.now() - timedelta(days=30)
            queryset = queryset.filter(created_at__gte=inicio_mes)

        return queryset

    # ========== MÉTODOS PRIVADOS DO DASHBOARD ==========

    def _calcular_vendas_hoje(self, hoje):
        """Calcula total e quantidade de vendas do dia"""
        vendas = Venda.objects.filter(
            created_at__date=hoje, status="FINALIZADA"
        ).aggregate(total=Sum("total"), quantidade=Count("id"))
        return {
            "total": float(vendas["total"] or 0),
            "quantidade": vendas["quantidade"],
        }

    def _calcular_lucro_hoje(self, hoje):
        """Calcula lucro do dia baseado em itens vendidos"""
        from core.models import ItemVenda
        from django.db.models import F

        lucro = ItemVenda.objects.filter(
            venda__created_at__date=hoje,
            venda__status="FINALIZADA",
            produto__preco_custo__gt=0,
        ).aggregate(
            lucro=Sum(
                F("quantidade") * (F("preco_unitario") - F("produto__preco_custo"))
            )
        )[
            "lucro"
        ] or Decimal(
            "0"
        )

        return float(lucro)

    def _calcular_vendas_por_pagamento(self, hoje):
        """Retorna vendas agrupadas por forma de pagamento"""
        vendas = (
            Venda.objects.filter(created_at__date=hoje, status="FINALIZADA")
            .values("forma_pagamento")
            .annotate(total=Sum("total"), quantidade=Count("id"))
        )
        return list(vendas)

    def _calcular_estoque(self):
        """Retorna contadores de produtos por status de estoque"""
        return {"baixo": Produto.objects.filter(estoque__lt=10, ativo=True).count()}

    def _calcular_produtos_validade(self, hoje):
        """Retorna contadores de LOTES vencidos e vencendo"""
        data_limite = hoje + timedelta(days=7)

        # Conta lotes distintos (evita contar o mesmo produto múltiplas vezes)
        lotes_vencidos = (
            Lote.objects.filter(
                data_validade__lt=hoje, ativo=True, data_validade__isnull=False
            )
            .values("produto")
            .distinct()
            .count()
        )

        lotes_vencendo = (
            Lote.objects.filter(
                data_validade__gte=hoje,
                data_validade__lte=data_limite,
                ativo=True,
                data_validade__isnull=False,
            )
            .values("produto")
            .distinct()
            .count()
        )

        return {"vencidos": lotes_vencidos, "vencendo": lotes_vencendo}

    def _calcular_contas_receber(self, hoje):
        """Calcula informações de contas a receber"""
        contas_pendentes = Venda.objects.filter(
            status="FINALIZADA", status_pagamento="PENDENTE"
        )

        contas_vencidas = contas_pendentes.filter(data_vencimento__lt=hoje)
        contas_vencendo_hoje = contas_pendentes.filter(data_vencimento=hoje)

        return {
            "total": float(
                contas_pendentes.aggregate(total=Sum("total"))["total"] or Decimal("0")
            ),
            "quantidade": contas_pendentes.count(),
            "vencidas": {
                "total": float(
                    contas_vencidas.aggregate(total=Sum("total"))["total"]
                    or Decimal("0")
                ),
                "quantidade": contas_vencidas.count(),
            },
            "vencendo_hoje": {"quantidade": contas_vencendo_hoje.count()},
        }

    def _calcular_info_caixa(self):
        """Retorna informações do caixa aberto (se houver)"""
        caixa_aberto = Caixa.objects.filter(status="ABERTO").first()
        if not caixa_aberto:
            return None

        # Calcula vendas em dinheiro desde abertura
        vendas_dinheiro = Venda.objects.filter(
            created_at__gte=caixa_aberto.data_abertura,
            forma_pagamento="DINHEIRO",
            status="FINALIZADA",
        ).aggregate(total=Sum("total"))["total"] or Decimal("0")

        # Movimentações
        movimentacoes = caixa_aberto.movimentacoes.aggregate(
            sangrias=Sum("valor", filter=Q(tipo="SANGRIA")),
            suprimentos=Sum("valor", filter=Q(tipo="SUPRIMENTO")),
        )
        total_sangrias = movimentacoes["sangrias"] or Decimal("0")
        total_suprimentos = movimentacoes["suprimentos"] or Decimal("0")

        valor_atual = (
            caixa_aberto.valor_inicial
            + vendas_dinheiro
            + total_suprimentos
            - total_sangrias
        )

        return {
            "id": caixa_aberto.id,
            "aberto_desde": caixa_aberto.data_abertura,
            "valor_inicial": float(caixa_aberto.valor_inicial),
            "valor_atual": float(valor_atual),
            "vendas_dinheiro": float(vendas_dinheiro),
        }

    # ========== ENDPOINT DASHBOARD ==========

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """Retorna estatísticas para o dashboard - Cache 2 minutos"""
        hoje = timezone.now().date()

        # Cache key única por dia
        cache_key = f"dashboard_{hoje.isoformat()}"
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        # Usa transaction.atomic() para manter conexão aberta e melhorar performance
        with transaction.atomic():
            # Calcula todas as métricas usando métodos privados
            estoque = self._calcular_estoque()
            validade = self._calcular_produtos_validade(hoje)

            dashboard_data = {
                "vendas_hoje": self._calcular_vendas_hoje(hoje),
                "lucro_hoje": self._calcular_lucro_hoje(hoje),
                "estoque_baixo": estoque["baixo"],
                "produtos_vencidos": validade["vencidos"],
                "produtos_vencendo": validade["vencendo"],
                "vendas_por_pagamento": self._calcular_vendas_por_pagamento(hoje),
                "contas_receber": self._calcular_contas_receber(hoje),
                "caixa": self._calcular_info_caixa(),
                "data": hoje.isoformat(),
                "cached": False,
            }

        # Salva no cache por 2 minutos (120 segundos)
        cache.set(cache_key, dashboard_data, 120)

        return Response(dashboard_data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancelar(self, request, pk=None):
        """Cancela uma venda e devolve estoque atomicamente"""
        from .services.lote_service import LoteService

        venda = self.get_object()

        if venda.status == "CANCELADA":
            return Response(
                {"error": "Venda já está cancelada"}, status=status.HTTP_400_BAD_REQUEST
            )

        if venda.status == "FINALIZADA":
            # Devolve o estoque respeitando o sistema de lotes
            for item in venda.itens.select_related("produto"):
                produto = item.produto
                quantidade = item.quantidade

                # Verifica se produto usa sistema de lotes
                if LoteService.produto_usa_lotes(produto):
                    # Devolve criando um lote de devolução
                    LoteService.devolver_estoque(produto, quantidade)
                    logger.info(
                        f"Venda {venda.numero} cancelada: {quantidade} un de "
                        f"{produto.nome} devolvida ao estoque via lote"
                    )
                else:
                    # Produto sem lotes: devolve diretamente
                    produto.estoque += quantidade
                    produto.save(update_fields=["estoque", "updated_at"])
                    logger.info(
                        f"Venda {venda.numero} cancelada: {quantidade} un de "
                        f"{produto.nome} devolvida ao estoque direto"
                    )

        venda.status = "CANCELADA"
        venda.save()

        # Log de auditoria
        logger.info(
            f"Venda cancelada - ID: {venda.id}, Número: {venda.numero}, "
            f"Total: R$ {venda.total}, Usuário: {request.user.username}"
        )

        # Invalida caches
        self._invalidate_vendas_cache()

        serializer = VendaSerializer(venda)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def contas_receber(self, request):
        """Retorna vendas fiado pendentes (contas a receber)"""
        vendas = (
            self.queryset.filter(status="FINALIZADA", status_pagamento="PENDENTE")
            .select_related("cliente")
            .order_by("data_vencimento", "created_at")
        )

        # Filtro opcional por cliente
        cliente_id = request.query_params.get("cliente_id", None)
        if cliente_id:
            vendas = vendas.filter(cliente_id=cliente_id)

        serializer = VendaSerializer(vendas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def receber(self, request, pk=None):
        """Marca uma venda fiado como paga"""
        venda = self.get_object()

        try:
            venda.receber_pagamento()

            # Log de auditoria
            logger.info(
                f"Pagamento recebido - Venda ID: {venda.id}, Número: {venda.numero}, "
                f"Total: R$ {venda.total}, Cliente: {venda.cliente.nome if venda.cliente else 'N/A'}, "
                f"Usuário: {request.user.username}"
            )

            # Invalida caches
            self._invalidate_vendas_cache()

            serializer = VendaSerializer(venda)
            return Response(serializer.data)
        except ValueError as e:
            logger.warning(
                f"Erro ao receber pagamento - Venda ID: {venda.id}, Erro: {str(e)}, "
                f"Usuário: {request.user.username}"
            )
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CaixaViewSet(viewsets.ViewSet):
    """ViewSet para controle de Caixa"""

    @action(detail=False, methods=["get"])
    def status(self, request):
        """Retorna o caixa aberto atual ou informa que não há caixa aberto"""
        caixa_aberto = Caixa.objects.filter(status="ABERTO").first()
        if not caixa_aberto:
            return Response({"status": "FECHADO", "message": "Nenhum caixa aberto"})

        serializer = CaixaSerializer(caixa_aberto)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def abrir(self, request):
        """Abre um novo caixa com validação de entrada"""
        if Caixa.objects.filter(status="ABERTO").exists():
            return Response(
                {"error": "Já existe um caixa aberto"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validação de input
        try:
            valor_inicial = Decimal(str(request.data.get("valor_inicial", 0)))
            if valor_inicial < 0:
                return Response(
                    {"error": "Valor inicial não pode ser negativo"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError, Exception):
            return Response(
                {"error": "Valor inicial inválido"}, status=status.HTTP_400_BAD_REQUEST
            )

        caixa = Caixa.objects.create(valor_inicial=valor_inicial)

        # Log de auditoria
        logger.info(
            f"Caixa aberto - ID: {caixa.id}, Valor inicial: R$ {valor_inicial}, "
            f"Usuário: {request.user.username}"
        )

        serializer = CaixaSerializer(caixa)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def fechar(self, request, pk=None):
        """Fecha o caixa atomicamente, calculando totais e diferenças"""
        try:
            # select_for_update previne race condition (dois usuários fechando simultaneamente)
            caixa = Caixa.objects.select_for_update().get(pk=pk, status="ABERTO")
        except Caixa.DoesNotExist:
            return Response(
                {"error": "Caixa não encontrado ou já está fechado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validação de input
        try:
            valor_final_informado = Decimal(
                str(request.data.get("valor_final_informado", 0))
            )
            if valor_final_informado < 0:
                return Response(
                    {"error": "Valor final informado não pode ser negativo"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError, Exception):
            return Response(
                {"error": "Valor final informado inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calcula vendas em dinheiro desde a abertura
        vendas_dinheiro = Venda.objects.filter(
            created_at__gte=caixa.data_abertura,
            forma_pagamento="DINHEIRO",
            status="FINALIZADA",
        ).aggregate(total=Sum("total"))["total"] or Decimal(0)

        # Calcula movimentações
        movimentacoes = caixa.movimentacoes.aggregate(
            sangrias=Sum("valor", filter=Q(tipo="SANGRIA")),
            suprimentos=Sum("valor", filter=Q(tipo="SUPRIMENTO")),
        )
        total_sangrias = movimentacoes["sangrias"] or Decimal(0)
        total_suprimentos = movimentacoes["suprimentos"] or Decimal(0)

        # Calcula valor final do sistema
        valor_final_sistema = (
            caixa.valor_inicial + vendas_dinheiro + total_suprimentos - total_sangrias
        )

        # Atualiza o caixa
        caixa.data_fechamento = timezone.now()
        caixa.valor_final_sistema = valor_final_sistema
        caixa.valor_final_informado = valor_final_informado
        caixa.diferenca = valor_final_informado - valor_final_sistema
        caixa.status = "FECHADO"
        caixa.observacoes = request.data.get("observacoes", "")
        caixa.save()

        # Log de auditoria
        logger.info(
            f"Caixa fechado - ID: {caixa.id}, Valor sistema: R$ {valor_final_sistema}, "
            f"Valor informado: R$ {valor_final_informado}, Diferença: R$ {caixa.diferenca}, "
            f"Usuário: {request.user.username}"
        )

        serializer = CaixaSerializer(caixa)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def movimentar(self, request, pk=None):
        """Adiciona uma movimentação (sangria/suprimento) ao caixa"""
        try:
            caixa = Caixa.objects.get(pk=pk, status="ABERTO")
        except Caixa.DoesNotExist:
            return Response(
                {"error": "Caixa não encontrado ou está fechado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MovimentacaoCaixaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(caixa=caixa)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def historico(self, request):
        """Retorna o histórico de caixas fechados"""
        caixas = Caixa.objects.filter(status="FECHADO")
        serializer = CaixaSerializer(caixas, many=True)
        return Response(serializer.data)


# ========== AUTENTICAÇÃO ==========


@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="5/m", method="POST", block=True)
def login(request):
    """Autentica usuário e retorna token - Rate limited: 5 tentativas por minuto por IP"""
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username e password são obrigatórios"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {"error": "Credenciais inválidas"}, status=status.HTTP_401_UNAUTHORIZED
        )

    # Cria ou recupera o token
    token, created = Token.objects.get_or_create(user=user)

    return Response(
        {
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
        }
    )


@api_view(["POST"])
def logout(request):
    """Remove o token do usuário"""
    try:
        request.user.auth_token.delete()
        return Response({"message": "Logout realizado com sucesso"})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def me(request):
    """Retorna informações do usuário autenticado"""
    return Response(
        {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint para monitoramento"""
    from django.core.cache import cache
    from django.conf import settings

    health_status = {
        "status": "healthy",
        "timestamp": timezone.now().isoformat(),
        "version": "1.0.0",
    }

    # Testa conexão com banco de dados
    try:
        connection.ensure_connection()
        # Query simples para testar performance
        Cliente.objects.count()
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    # Testa cache (Redis ou LocMem)
    try:
        cache_key = "health_check_test"
        cache_value = f"ok_{timezone.now().timestamp()}"

        # Tenta setar e recuperar
        cache.set(cache_key, cache_value, 30)
        cached = cache.get(cache_key)

        # Converte para string se vier como bytes (Redis)
        if isinstance(cached, bytes):
            cached = cached.decode("utf-8")

        if cached == cache_value:
            # Detecta o tipo de cache
            cache_backend = settings.CACHES["default"]["BACKEND"]
            if "redis" in cache_backend.lower():
                cache_type = "redis"
            elif "locmem" in cache_backend.lower():
                cache_type = "locmem"
            else:
                cache_type = "unknown"

            health_status["cache"] = {"status": "working", "backend": cache_type}
        else:
            health_status["cache"] = {
                "status": "error",
                "message": "cache value mismatch",
            }
    except Exception as e:
        health_status["cache"] = {"status": "error", "message": str(e)}
        # Cache não é crítico, não muda status geral

    # Verifica caixa aberto
    try:
        caixa_aberto = Caixa.objects.filter(status="ABERTO").exists()
        health_status["caixa_aberto"] = caixa_aberto
    except Exception:
        pass

    status_code = 200 if health_status["status"] == "healthy" else 503
    return Response(health_status, status=status_code)


class AlertaViewSet(viewsets.ModelViewSet):
    """ViewSet para Alertas do Sistema"""

    queryset = Alerta.objects.select_related(
        "cliente", "produto", "venda", "caixa", "lote"
    ).all()
    serializer_class = AlertaSerializer

    def get_queryset(self):
        """Filtra alertas por parâmetros de query"""
        queryset = super().get_queryset()

        # Filtro por status
        resolvido = self.request.query_params.get("resolvido", None)
        if resolvido is not None:
            queryset = queryset.filter(resolvido=resolvido.lower() == "true")

        lido = self.request.query_params.get("lido", None)
        if lido is not None:
            queryset = queryset.filter(lido=lido.lower() == "true")

        # Filtro por tipo
        tipo = self.request.query_params.get("tipo", None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        # Filtro por prioridade
        prioridade = self.request.query_params.get("prioridade", None)
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)

        return queryset.select_related("cliente", "produto", "venda", "caixa")

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        """Retorna resumo de alertas"""
        resumo = AlertService.obter_resumo()
        return Response(resumo)

    @action(detail=False, methods=["post"])
    def verificar(self, request):
        """Executa verificação manual de alertas"""
        resultado = AlertService.verificar_todos()
        return Response(
            {
                "total_criados": resultado["total_criados"],
                "resumo": AlertService.obter_resumo(),
            }
        )

    @action(detail=True, methods=["post"])
    def marcar_lido(self, request, pk=None):
        """Marca um alerta como lido"""
        alerta = self.get_object()
        alerta.marcar_como_lido()
        serializer = self.get_serializer(alerta)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def resolver(self, request, pk=None):
        """Marca um alerta como resolvido"""
        alerta = self.get_object()
        alerta.resolver()
        serializer = self.get_serializer(alerta)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def marcar_todos_lidos(self, request):
        """Marca todos os alertas pendentes como lidos"""
        alertas = Alerta.objects.filter(lido=False, resolvido=False)
        count = alertas.count()
        alertas.update(lido=True)
        return Response(
            {"message": f"{count} alerta(s) marcado(s) como lido(s)", "count": count}
        )

    @action(detail=False, methods=["get"])
    def por_prioridade(self, request):
        """Retorna alertas agrupados por prioridade"""
        alertas = Alerta.objects.filter(resolvido=False)

        resultado = {
            "CRITICA": AlertaSerializer(
                alertas.filter(prioridade="CRITICA"), many=True
            ).data,
            "ALTA": AlertaSerializer(alertas.filter(prioridade="ALTA"), many=True).data,
            "MEDIA": AlertaSerializer(
                alertas.filter(prioridade="MEDIA"), many=True
            ).data,
            "BAIXA": AlertaSerializer(
                alertas.filter(prioridade="BAIXA"), many=True
            ).data,
        }

        return Response(resultado)


class LoteViewSet(viewsets.ModelViewSet):
    """ViewSet para Lotes de Produtos"""

    queryset = Lote.objects.all()
    serializer_class = LoteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por produto
        produto_id = self.request.query_params.get("produto_id", None)
        if produto_id:
            queryset = queryset.filter(produto_id=produto_id)

        # Filtro por ativos
        ativo = self.request.query_params.get("ativo", None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == "true")

        # Filtro por vencidos
        vencidos = self.request.query_params.get("vencidos", None)
        if vencidos == "true":
            queryset = queryset.filter(data_validade__lt=timezone.now().date())

        # Filtro por próximos ao vencimento (7 dias)
        proximos_vencimento = self.request.query_params.get("proximos_vencimento", None)
        if proximos_vencimento == "true":
            hoje = timezone.now().date()
            data_limite = hoje + timedelta(days=7)
            queryset = queryset.filter(
                data_validade__gte=hoje, data_validade__lte=data_limite
            )

        return queryset

    @action(detail=False, methods=["post"])
    def entrada_estoque(self, request):
        """
        Adiciona um novo lote ao estoque (entrada de mercadoria).
        Atualiza também o estoque total do produto.
        """
        produto_id = request.data.get("produto_id")
        quantidade = Decimal(str(request.data.get("quantidade", 0)))
        data_validade = request.data.get("data_validade")
        numero_lote = request.data.get("numero_lote", "")
        fornecedor_id = request.data.get("fornecedor_id")
        preco_custo_lote = request.data.get("preco_custo_lote")
        observacoes = request.data.get("observacoes", "")

        # Log para debug - mostra TODOS os dados recebidos
        logger.info("=== ENTRADA DE ESTOQUE ===")
        logger.info(f"Todos os dados: {request.data}")
        logger.info(
            f"data_validade recebida: {data_validade} (tipo: {type(data_validade).__name__})"
        )

        # Trata string vazia como None
        if data_validade == "" or data_validade == "null":
            logger.info('data_validade tratada como None (era string vazia ou "null")')
            data_validade = None

        logger.info(f"data_validade após tratamento: {data_validade}")

        # Validações
        if not produto_id:
            return Response(
                {"error": "produto_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantidade <= 0:
            return Response(
                {"error": "Quantidade deve ser maior que zero"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            produto = Produto.objects.get(id=produto_id)
        except Produto.DoesNotExist:
            return Response(
                {"error": "Produto não encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

        # Valida fornecedor se fornecido
        fornecedor_obj = None
        if fornecedor_id:
            try:
                fornecedor_obj = Fornecedor.objects.get(id=fornecedor_id)
            except Fornecedor.DoesNotExist:
                return Response(
                    {"error": "Fornecedor não encontrado"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        with transaction.atomic():
            # Cria o lote
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=numero_lote,
                quantidade=quantidade,
                data_validade=data_validade if data_validade else None,
                fornecedor=fornecedor_obj,
                preco_custo_lote=(
                    Decimal(str(preco_custo_lote)) if preco_custo_lote else None
                ),
                observacoes=observacoes,
                ativo=True,
            )

            # Atualiza o estoque total do produto
            produto.estoque += quantidade
            produto.save(update_fields=["estoque"])

            logger.info(
                f"Entrada de estoque: Lote {lote.id} criado para produto {produto.nome} (+{quantidade} un)"
            )

        # Recarrega o lote com produto para evitar erro no serializer
        lote = Lote.objects.select_related("produto").get(pk=lote.pk)
        serializer = self.get_serializer(lote)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def baixar_estoque(self, request, pk=None):
        """
        Baixa estoque de um lote específico (ajuste manual).
        Atualiza também o estoque total do produto.
        """
        lote = self.get_object()
        quantidade = Decimal(str(request.data.get("quantidade", 0)))

        if quantidade <= 0:
            return Response(
                {"error": "Quantidade deve ser maior que zero"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantidade > lote.quantidade:
            return Response(
                {
                    "error": f"Quantidade insuficiente no lote. Disponível: {lote.quantidade}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Baixa do lote
            lote._skip_signal_update = True
            try:
                lote.quantidade -= quantidade
                lote.save(update_fields=["quantidade"])
            finally:
                if hasattr(lote, "_skip_signal_update"):
                    delattr(lote, "_skip_signal_update")

            # Desativa se zerou
            if lote.quantidade == 0:
                lote.ativo = False
                lote.save(update_fields=["ativo"])

            # Atualiza estoque do produto
            produto = lote.produto
            produto.estoque -= quantidade
            produto.save(update_fields=["estoque"])

            logger.info(f"Baixa de estoque: Lote {lote.id} -{quantidade} un")

        serializer = self.get_serializer(lote)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def vencidos(self, request):
        """Retorna lotes vencidos"""
        lotes_vencidos = self.get_queryset().filter(
            data_validade__lt=timezone.now().date(), ativo=True
        )
        serializer = self.get_serializer(lotes_vencidos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def proximos_vencimento(self, request):
        """Retorna lotes próximos ao vencimento (7 dias)"""
        hoje = timezone.now().date()
        data_limite = hoje + timedelta(days=7)

        lotes_proximos = self.get_queryset().filter(
            data_validade__gte=hoje, data_validade__lte=data_limite, ativo=True
        )
        serializer = self.get_serializer(lotes_proximos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def por_produto(self, request):
        """Retorna lotes agrupados por produto"""
        produto_id = request.query_params.get("produto_id")

        if not produto_id:
            return Response(
                {"error": "produto_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lotes = self.get_queryset().filter(produto_id=produto_id, ativo=True)
        serializer = self.get_serializer(lotes, many=True)

        return Response(
            {
                "produto_id": produto_id,
                "total_lotes": lotes.count(),
                "estoque_total": sum(float(lote.quantidade) for lote in lotes),
                "lotes": serializer.data,
            }
        )
