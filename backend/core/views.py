"""
Views da API - HMConveniencia
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Cliente, Produto, Venda, Caixa, MovimentacaoCaixa
from .serializers import (
    ClienteSerializer,
    ProdutoSerializer,
    VendaSerializer,
    VendaCreateSerializer,
    CaixaSerializer,
    MovimentacaoCaixaSerializer
)


class ClienteViewSet(viewsets.ModelViewSet):
    """ViewSet para Clientes"""
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por ativos
        ativo = self.request.query_params.get('ativo', None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == 'true')

        # Busca por nome
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(nome__icontains=search)

        return queryset

    @action(detail=False, methods=['get'])
    def com_dividas(self, request):
        """Retorna clientes com vendas pendentes"""
        clientes_ids = Venda.objects.filter(
            status_pagamento='PENDENTE'
        ).values_list('cliente_id', flat=True).distinct()

        clientes = self.queryset.filter(id__in=clientes_ids)
        serializer = self.get_serializer(clientes, many=True)
        return Response(serializer.data)


class ProdutoViewSet(viewsets.ModelViewSet):
    """ViewSet para Produtos"""
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por ativos
        ativo = self.request.query_params.get('ativo', None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == 'true')

        # Busca por nome ou código
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(nome__icontains=search) | queryset.filter(codigo_barras__icontains=search)

        return queryset

    @action(detail=False, methods=['get'])
    def baixo_estoque(self, request):
        """Retorna produtos com estoque baixo (< 10)"""
        produtos = self.queryset.filter(estoque__lt=10, ativo=True)
        serializer = self.get_serializer(produtos, many=True)
        return Response(serializer.data)


class VendaViewSet(viewsets.ModelViewSet):
    """ViewSet para Vendas"""
    queryset = Venda.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return VendaCreateSerializer
        return VendaSerializer

    def create(self, request, *args, **kwargs):
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        venda = create_serializer.save()
        read_serializer = VendaSerializer(venda)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filtro por data (hoje, esta semana, este mês)
        periodo = self.request.query_params.get('periodo', None)
        if periodo == 'hoje':
            hoje = timezone.now().date()
            queryset = queryset.filter(created_at__date=hoje)
        elif periodo == 'semana':
            inicio_semana = timezone.now() - timedelta(days=7)
            queryset = queryset.filter(created_at__gte=inicio_semana)
        elif periodo == 'mes':
            inicio_mes = timezone.now() - timedelta(days=30)
            queryset = queryset.filter(created_at__gte=inicio_mes)

        return queryset

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Retorna estatísticas para o dashboard"""
        hoje = timezone.now().date()

        # Vendas de hoje
        vendas_hoje = Venda.objects.filter(
            created_at__date=hoje,
            status='FINALIZADA'
        )

        total_hoje = vendas_hoje.aggregate(total=Sum('total'))['total'] or 0
        quantidade_vendas = vendas_hoje.count()

        # Produtos com estoque baixo
        estoque_baixo = Produto.objects.filter(estoque__lt=10, ativo=True).count()

        # Vendas por forma de pagamento hoje
        vendas_por_pagamento = vendas_hoje.values('forma_pagamento').annotate(
            total=Sum('total'),
            quantidade=Count('id')
        )

        return Response({
            'vendas_hoje': {
                'total': float(total_hoje),
                'quantidade': quantidade_vendas,
            },
            'estoque_baixo': estoque_baixo,
            'vendas_por_pagamento': list(vendas_por_pagamento),
            'data': hoje.isoformat(),
        })

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela uma venda"""
        venda = self.get_object()

        if venda.status == 'CANCELADA':
            return Response(
                {'error': 'Venda já está cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if venda.status == 'FINALIZADA':
            # Devolve o estoque
            for item in venda.itens.all():
                item.produto.estoque += item.quantidade
                item.produto.save()

        venda.status = 'CANCELADA'
        venda.save()

        serializer = self.get_serializer(venda)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def contas_receber(self, request):
        """Retorna vendas fiado pendentes (contas a receber)"""
        vendas = self.queryset.filter(
            status='FINALIZADA',
            status_pagamento='PENDENTE'
        ).select_related('cliente').order_by('data_vencimento', 'created_at')

        # Filtro opcional por cliente
        cliente_id = request.query_params.get('cliente_id', None)
        if cliente_id:
            vendas = vendas.filter(cliente_id=cliente_id)

        serializer = self.get_serializer(vendas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def receber(self, request, pk=None):
        """Marca uma venda fiado como paga"""
        venda = self.get_object()

        try:
            venda.receber_pagamento()
            serializer = self.get_serializer(venda)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CaixaViewSet(viewsets.ViewSet):
    """ViewSet para controle de Caixa"""

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Retorna o caixa aberto atual ou informa que não há caixa aberto"""
        caixa_aberto = Caixa.objects.filter(status='ABERTO').first()
        if not caixa_aberto:
            return Response({'status': 'FECHADO', 'message': 'Nenhum caixa aberto'})

        serializer = CaixaSerializer(caixa_aberto)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def abrir(self, request):
        """Abre um novo caixa"""
        if Caixa.objects.filter(status='ABERTO').exists():
            return Response(
                {'error': 'Já existe um caixa aberto'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valor_inicial = request.data.get('valor_inicial', 0)
        caixa = Caixa.objects.create(valor_inicial=valor_inicial)
        serializer = CaixaSerializer(caixa)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def fechar(self, request, pk=None):
        """Fecha o caixa, calculando totais e diferenças"""
        try:
            caixa = Caixa.objects.get(pk=pk, status='ABERTO')
        except Caixa.DoesNotExist:
            return Response(
                {'error': 'Caixa não encontrado ou já está fechado'},
                status=status.HTTP_404_NOT_FOUND
            )

        valor_final_informado = Decimal(request.data.get('valor_final_informado', 0))

        # Calcula vendas em dinheiro desde a abertura
        vendas_dinheiro = Venda.objects.filter(
            created_at__gte=caixa.data_abertura,
            forma_pagamento='DINHEIRO',
            status='FINALIZADA'
        ).aggregate(total=Sum('total'))['total'] or Decimal(0)

        # Calcula movimentações
        movimentacoes = caixa.movimentacoes.aggregate(
            sangrias=Sum('valor', filter=Q(tipo='SANGRIA')),
            suprimentos=Sum('valor', filter=Q(tipo='SUPRIMENTO'))
        )
        total_sangrias = movimentacoes['sangrias'] or Decimal(0)
        total_suprimentos = movimentacoes['suprimentos'] or Decimal(0)

        # Calcula valor final do sistema
        valor_final_sistema = (caixa.valor_inicial + vendas_dinheiro 
                               + total_suprimentos - total_sangrias)

        # Atualiza o caixa
        caixa.data_fechamento = timezone.now()
        caixa.valor_final_sistema = valor_final_sistema
        caixa.valor_final_informado = valor_final_informado
        caixa.diferenca = valor_final_informado - valor_final_sistema
        caixa.status = 'FECHADO'
        caixa.observacoes = request.data.get('observacoes', '')
        caixa.save()

        serializer = CaixaSerializer(caixa)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def movimentar(self, request, pk=None):
        """Adiciona uma movimentação (sangria/suprimento) ao caixa"""
        try:
            caixa = Caixa.objects.get(pk=pk, status='ABERTO')
        except Caixa.DoesNotExist:
            return Response(
                {'error': 'Caixa não encontrado ou está fechado'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MovimentacaoCaixaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(caixa=caixa)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def historico(self, request):
        """Retorna o histórico de caixas fechados"""
        caixas = Caixa.objects.filter(status='FECHADO')
        serializer = CaixaSerializer(caixas, many=True)
        return Response(serializer.data)
