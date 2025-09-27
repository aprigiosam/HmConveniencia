from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, Sum, Case, When, DecimalField
from django.db import transaction
from datetime import date, timedelta
from decimal import Decimal
from .models import MovimentacaoEstoque, TransferenciaEstoque, InventarioEstoque, ItemInventario
from apps.catalog.models import LoteProduto, Produto
from apps.core.models import Loja
from .serializers import (
    MovimentacaoEstoqueSerializer, TransferenciaEstoqueSerializer,
    InventarioEstoqueSerializer, ItemInventarioSerializer,
    LoteComVencimentoSerializer, EntradaEstoqueSerializer, AjusteEstoqueSerializer
)


class EstoqueViewSet(viewsets.ViewSet):
    """ViewSet principal para controle de estoque com foco na validade"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Resumo geral do estoque com alertas de vencimento"""
        loja_id = request.query_params.get('loja', None)

        # Base queryset dos lotes
        lotes = LoteProduto.objects.select_related('produto', 'loja')
        if loja_id:
            lotes = lotes.filter(loja_id=loja_id)

        hoje = date.today()

        # Estatisticas gerais
        stats = {
            'total_produtos': Produto.objects.filter(ativo=True).count(),
            'total_lotes': lotes.count(),
            'produtos_sem_estoque': 0,
            'produtos_estoque_baixo': 0,
            'lotes_vencidos': 0,
            'lotes_proximo_vencimento': 0,
            'valor_total_estoque': 0
        }

        # Lotes vencidos
        lotes_vencidos = lotes.filter(
            data_vencimento__lt=hoje,
            quantidade__gt=0
        )
        stats['lotes_vencidos'] = lotes_vencidos.count()

        # Lotes proximos ao vencimento (proximos 30 dias)
        data_limite = hoje + timedelta(days=30)
        lotes_proximo_vencimento = lotes.filter(
            data_vencimento__gte=hoje,
            data_vencimento__lte=data_limite,
            quantidade__gt=0
        )
        stats['lotes_proximo_vencimento'] = lotes_proximo_vencimento.count()

        # Valor total do estoque
        valor_total = lotes.filter(quantidade__gt=0).aggregate(
            total=Sum(F('quantidade') * F('custo_unitario'))
        )['total'] or 0
        stats['valor_total_estoque'] = float(valor_total)

        return Response(stats)

    @action(detail=False, methods=['get'])
    def lotes_vencimento(self, request):
        """Lista lotes proximos ao vencimento ou vencidos"""
        loja_id = request.query_params.get('loja', None)
        status_filter = request.query_params.get('status', 'todos')  # vencidos, proximo, todos

        lotes = LoteProduto.objects.select_related('produto', 'loja').filter(quantidade__gt=0)
        if loja_id:
            lotes = lotes.filter(loja_id=loja_id)

        hoje = date.today()

        if status_filter == 'vencidos':
            lotes = lotes.filter(data_vencimento__lt=hoje)
        elif status_filter == 'proximo':
            data_limite = hoje + timedelta(days=30)
            lotes = lotes.filter(data_vencimento__gte=hoje, data_vencimento__lte=data_limite)
        else:
            # Todos os lotes com data de vencimento definida
            lotes = lotes.filter(data_vencimento__isnull=False)

        serializer = LoteComVencimentoSerializer(lotes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def entrada_estoque(self, request):
        """Registra entrada de estoque criando ou atualizando lote"""
        serializer = EntradaEstoqueSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            with transaction.atomic():
                produto = Produto.objects.select_for_update().get(id=data['produto'])
                loja = Loja.objects.select_for_update().get(id=data['loja'])
                quantidade_delta = int(data['quantidade'])

                try:
                    lote = LoteProduto.objects.select_for_update().get(
                        produto=produto,
                        loja=loja,
                        numero_lote=data['numero_lote']
                    )
                    quantidade_anterior = int(lote.quantidade)
                    lote.custo_unitario = data['custo_unitario']
                    if data.get('data_vencimento') is not None:
                        lote.data_vencimento = data['data_vencimento']
                except LoteProduto.DoesNotExist:
                    lote = LoteProduto.objects.create(
                        produto=produto,
                        loja=loja,
                        numero_lote=data['numero_lote'],
                        data_vencimento=data.get('data_vencimento'),
                        quantidade=0,
                        custo_unitario=data['custo_unitario']
                    )
                    quantidade_anterior = 0

                lote.quantidade = int(lote.quantidade) + quantidade_delta
                lote.save()

                MovimentacaoEstoque.objects.create(
                    loja=loja,
                    produto=produto,
                    lote=lote,
                    tipo=MovimentacaoEstoque.Tipo.ENTRADA,
                    quantidade=Decimal(quantidade_delta),
                    quantidade_anterior=Decimal(quantidade_anterior),
                    motivo=data.get('motivo', 'Entrada de estoque'),
                    observacoes=data.get('observacoes', '')
                )

                return Response({
                    'message': 'Entrada registrada com sucesso',
                    'lote_id': lote.id,
                    'quantidade_total': lote.quantidade
                })

        except (Produto.DoesNotExist, Loja.DoesNotExist) as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as exc:
            return Response(
                {'error': f'Erro ao registrar entrada: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def ajuste_estoque(self, request):
        """Realiza ajuste de estoque"""
        serializer = AjusteEstoqueSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            with transaction.atomic():
                produto = Produto.objects.select_for_update().get(id=data['produto'])
                loja = Loja.objects.select_for_update().get(id=data['loja'])
                quantidade_final = int(data['quantidade'])
                lote = None

                if data.get('lote'):
                    lote = LoteProduto.objects.select_for_update().get(
                        id=data['lote'],
                        loja=loja,
                        produto=produto
                    )
                    quantidade_anterior = int(lote.quantidade)
                    lote.quantidade = quantidade_final
                    lote.save()
                else:
                    quantidade_anterior = 0

                MovimentacaoEstoque.objects.create(
                    loja=loja,
                    produto=produto,
                    lote=lote,
                    tipo=MovimentacaoEstoque.Tipo.AJUSTE,
                    quantidade=Decimal(quantidade_final),
                    quantidade_anterior=Decimal(quantidade_anterior),
                    motivo=data['motivo'],
                    observacoes=data.get('observacoes', '')
                )

                return Response({'message': 'Ajuste realizado com sucesso'})

        except (Produto.DoesNotExist, Loja.DoesNotExist, LoteProduto.DoesNotExist) as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as exc:
            return Response(
                {'error': f'Erro ao realizar ajuste: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    @action(detail=False, methods=['get'])
    def alertas_vencimento(self, request):
        """Retorna alertas de produtos proximos ao vencimento"""
        loja_id = request.query_params.get('loja', None)

        alertas = []
        hoje = date.today()

        # Buscar produtos que controlam vencimento
        produtos_com_controle = Produto.objects.filter(
            controla_vencimento=True,
            ativo=True
        )

        for produto in produtos_com_controle:
            lotes = LoteProduto.objects.filter(
                produto=produto,
                quantidade__gt=0,
                data_vencimento__isnull=False
            )

            if loja_id:
                lotes = lotes.filter(loja_id=loja_id)

            for lote in lotes:
                dias_vencimento = (lote.data_vencimento - hoje).days

                if dias_vencimento < 0:
                    tipo_alerta = "VENCIDO"
                    prioridade = "ALTA"
                elif dias_vencimento <= produto.dias_alerta_vencimento:
                    tipo_alerta = "PROXIMO_VENCIMENTO"
                    prioridade = "MEDIA"
                else:
                    continue

                alertas.append({
                    'tipo': tipo_alerta,
                    'prioridade': prioridade,
                    'produto_id': produto.id,
                    'produto_nome': produto.nome,
                    'produto_sku': produto.sku,
                    'lote_id': lote.id,
                    'numero_lote': lote.numero_lote,
                    'data_vencimento': lote.data_vencimento,
                    'dias_vencimento': dias_vencimento,
                    'quantidade': lote.quantidade,
                    'pode_vender': produto.permite_venda_vencido if dias_vencimento < 0 else True
                })

        # Ordenar por prioridade e dias de vencimento
        alertas.sort(key=lambda x: (x['prioridade'] == 'MEDIA', x['dias_vencimento']))

        return Response(alertas)


class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all()
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MovimentacaoEstoque.objects.select_related('produto', 'loja', 'lote')

        # Filtros
        produto_id = self.request.query_params.get('produto', None)
        loja_id = self.request.query_params.get('loja', None)
        tipo = self.request.query_params.get('tipo', None)

        if produto_id:
            queryset = queryset.filter(produto_id=produto_id)
        if loja_id:
            queryset = queryset.filter(loja_id=loja_id)
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset.order_by('-created_at')


class LoteViewSet(viewsets.ModelViewSet):
    queryset = LoteProduto.objects.all()
    serializer_class = LoteComVencimentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = LoteProduto.objects.select_related('produto', 'loja')

        # Filtros
        produto_id = self.request.query_params.get('produto', None)
        loja_id = self.request.query_params.get('loja', None)
        com_estoque = self.request.query_params.get('com_estoque', None)

        if produto_id:
            queryset = queryset.filter(produto_id=produto_id)
        if loja_id:
            queryset = queryset.filter(loja_id=loja_id)
        if com_estoque == 'true':
            queryset = queryset.filter(quantidade__gt=0)

        return queryset.order_by('data_vencimento', 'numero_lote')


class TransferenciaEstoqueViewSet(viewsets.ModelViewSet):
    queryset = TransferenciaEstoque.objects.all()
    serializer_class = TransferenciaEstoqueSerializer
    permission_classes = [IsAuthenticated]


class InventarioEstoqueViewSet(viewsets.ModelViewSet):
    queryset = InventarioEstoque.objects.all()
    serializer_class = InventarioEstoqueSerializer
    permission_classes = [IsAuthenticated]


class ItemInventarioViewSet(viewsets.ModelViewSet):
    queryset = ItemInventario.objects.all()
    serializer_class = ItemInventarioSerializer
    permission_classes = [IsAuthenticated]





