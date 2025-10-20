"""
Views da API - HMConveniencia
"""
from django.core.management import call_command
from django.contrib.auth import authenticate
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.db import connection
from datetime import timedelta
from decimal import Decimal
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from .models import Cliente, Produto, Venda, Caixa, MovimentacaoCaixa, Categoria
from .serializers import (
    ClienteSerializer,
    ProdutoSerializer,
    VendaSerializer,
    VendaCreateSerializer,
    CaixaSerializer,
    MovimentacaoCaixaSerializer,
    CategoriaSerializer
)


class CategoriaViewSet(viewsets.ModelViewSet):
    """ViewSet para Categorias de Produtos"""
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtro por ativos
        ativo = self.request.query_params.get('ativo', None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == 'true')
        return queryset


class BackupViewSet(viewsets.ViewSet):
    """ViewSet para acionar backups do banco de dados"""

    @action(detail=False, methods=['post'])
    @method_decorator(ratelimit(key='user', rate='1/m', method='POST', block=True))
    def trigger_backup(self, request):
        """Aciona o comando de backup do banco de dados - Rate limited: 1 backup por minuto"""
        try:
            call_command('backup_db')
            return Response({'message': 'Backup iniciado com sucesso!'},
                            status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Erro ao iniciar backup: {e}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        """Retorna clientes com vendas pendentes - Cache 5 minutos"""
        cache_key = 'clientes_com_dividas'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        # Otimizado: usa annotate em vez de N+1 queries
        clientes = Cliente.objects.filter(
            vendas__status_pagamento='PENDENTE',
            vendas__status='FINALIZADA',
            ativo=True
        ).annotate(
            total_divida=Sum('vendas__total'),
            qtd_vendas_pendentes=Count('vendas')
        ).distinct().order_by('nome')

        serializer = ClienteSerializer(clientes, many=True)
        data = serializer.data

        # Salva no cache por 5 minutos (300 segundos)
        cache.set(cache_key, data, 300)

        return Response(data)


class ProdutoViewSet(viewsets.ModelViewSet):
    """ViewSet para Produtos"""
    queryset = Produto.objects.select_related('categoria').all()
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
        """Retorna produtos com estoque baixo (< 10) - Cache 5 minutos"""
        cache_key = 'produtos_baixo_estoque'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        produtos = self.queryset.filter(estoque__lt=10, ativo=True)
        serializer = ProdutoSerializer(produtos, many=True)
        data = serializer.data

        # Salva no cache por 5 minutos (300 segundos)
        cache.set(cache_key, data, 300)

        return Response(data)

    @action(detail=False, methods=['get'])
    def mais_lucrativos(self, request):
        """Retorna os produtos mais lucrativos - Cache 15 minutos"""
        from django.db.models import F
        from core.models import ItemVenda

        # Cache key
        cache_key = 'produtos_mais_lucrativos'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        # Agrega os dados de vendas por produto
        produtos_lucro = ItemVenda.objects.filter(
            venda__status='FINALIZADA',
            produto__preco_custo__gt=0  # Considera apenas produtos com custo definido
        ).values('produto__nome', 'produto__preco', 'produto__preco_custo').annotate(
            total_vendido=Sum('quantidade'),
            receita_total=Sum(F('quantidade') * F('preco_unitario')),
            custo_total=Sum(F('quantidade') * F('produto__preco_custo')),
            lucro_total=Sum(F('quantidade') * (F('preco_unitario') - F('produto__preco_custo')))
        ).order_by('-lucro_total')

        # Formata a saída
        results = []
        for item in produtos_lucro:
            results.append({
                'nome_produto': item['produto__nome'],
                'preco_venda': float(item['produto__preco']),
                'preco_custo': float(item['produto__preco_custo']),
                'total_vendido': float(item['total_vendido']),
                'receita_total': float(item['receita_total']),
                'custo_total': float(item['custo_total']),
                'lucro_total': float(item['lucro_total']),
            })

        # Salva no cache por 15 minutos (900 segundos)
        cache.set(cache_key, results, 900)

        return Response(results)


class VendaViewSet(viewsets.ModelViewSet):
    """ViewSet para Vendas"""
    queryset = Venda.objects.select_related('cliente').prefetch_related('itens__produto').all()

    def get_serializer_class(self):
        if self.action == 'create':
            return VendaCreateSerializer
        return VendaSerializer

    @method_decorator(ratelimit(key='user', rate='30/m', block=True))
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
            f'dashboard_{hoje.isoformat()}',
            'produtos_mais_lucrativos',
            'clientes_com_dividas',
            'produtos_baixo_estoque',
        ]
        cache.delete_many(cache_keys)

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
        """Retorna estatísticas para o dashboard - Cache 2 minutos"""
        hoje = timezone.now().date()

        # Cache key única por dia
        cache_key = f'dashboard_{hoje.isoformat()}'
        cached_data = cache.get(cache_key)

        if cached_data:
            # Retorna do cache
            return Response(cached_data)

        # Se não está em cache, calcula
        agora = timezone.now()

        # Vendas de hoje
        vendas_hoje = Venda.objects.filter(
            created_at__date=hoje,
            status='FINALIZADA'
        )

        total_hoje = vendas_hoje.aggregate(total=Sum('total'))['total'] or 0
        quantidade_vendas = vendas_hoje.count()

        # Produtos com estoque baixo
        estoque_baixo = Produto.objects.filter(estoque__lt=10, ativo=True).count()

        # Cálculo de Lucro Hoje
        from core.models import ItemVenda
        from django.db.models import F
        lucro_hoje = ItemVenda.objects.filter(
            venda__created_at__date=hoje,
            venda__status='FINALIZADA',
            produto__preco_custo__gt=0
        ).aggregate(
            lucro=Sum(F('quantidade') * (F('preco_unitario') - F('produto__preco_custo')))
        )['lucro'] or Decimal('0')

        # Produtos vencidos e próximos ao vencimento
        produtos_vencidos = Produto.objects.filter(
            data_validade__lt=hoje,
            ativo=True
        ).count()

        # Produtos vencendo em até 7 dias
        data_limite = hoje + timedelta(days=7)
        produtos_vencendo = Produto.objects.filter(
            data_validade__gte=hoje,
            data_validade__lte=data_limite,
            ativo=True
        ).count()

        # Vendas por forma de pagamento hoje
        vendas_por_pagamento = vendas_hoje.values('forma_pagamento').annotate(
            total=Sum('total'),
            quantidade=Count('id')
        )

        # CONTAS A RECEBER - Informações críticas
        contas_pendentes = Venda.objects.filter(
            status='FINALIZADA',
            status_pagamento='PENDENTE'
        )

        total_a_receber = contas_pendentes.aggregate(total=Sum('total'))['total'] or Decimal('0')

        # Contas vencidas (ALERTA VERMELHO)
        contas_vencidas = contas_pendentes.filter(
            data_vencimento__lt=hoje
        )
        total_vencido = contas_vencidas.aggregate(total=Sum('total'))['total'] or Decimal('0')
        quantidade_vencidas = contas_vencidas.count()

        # Contas vencendo hoje
        contas_vencendo_hoje = contas_pendentes.filter(
            data_vencimento=hoje
        )
        quantidade_vencendo_hoje = contas_vencendo_hoje.count()

        # Status do Caixa
        caixa_aberto = Caixa.objects.filter(status='ABERTO').first()
        caixa_info = None
        if caixa_aberto:
            # Calcula vendas em dinheiro desde abertura
            vendas_dinheiro = Venda.objects.filter(
                created_at__gte=caixa_aberto.data_abertura,
                forma_pagamento='DINHEIRO',
                status='FINALIZADA'
            ).aggregate(total=Sum('total'))['total'] or Decimal('0')

            # Movimentações
            movimentacoes = caixa_aberto.movimentacoes.aggregate(
                sangrias=Sum('valor', filter=Q(tipo='SANGRIA')),
                suprimentos=Sum('valor', filter=Q(tipo='SUPRIMENTO'))
            )
            total_sangrias = movimentacoes['sangrias'] or Decimal('0')
            total_suprimentos = movimentacoes['suprimentos'] or Decimal('0')

            valor_atual = (caixa_aberto.valor_inicial + vendas_dinheiro
                          + total_suprimentos - total_sangrias)

            caixa_info = {
                'id': caixa_aberto.id,
                'aberto_desde': caixa_aberto.data_abertura,
                'valor_inicial': float(caixa_aberto.valor_inicial),
                'valor_atual': float(valor_atual),
                'vendas_dinheiro': float(vendas_dinheiro)
            }

        # Prepara dados para response e cache
        dashboard_data = {
            'vendas_hoje': {
                'total': float(total_hoje),
                'quantidade': quantidade_vendas,
            },
            'lucro_hoje': float(lucro_hoje),
            'estoque_baixo': estoque_baixo,
            'produtos_vencidos': produtos_vencidos,
            'produtos_vencendo': produtos_vencendo,
            'vendas_por_pagamento': list(vendas_por_pagamento),
            'contas_receber': {
                'total': float(total_a_receber),
                'quantidade': contas_pendentes.count(),
                'vencidas': {
                    'total': float(total_vencido),
                    'quantidade': quantidade_vencidas
                },
                'vencendo_hoje': {
                    'quantidade': quantidade_vencendo_hoje
                }
            },
            'caixa': caixa_info,
            'data': hoje.isoformat(),
            'cached': False  # Indica que foi calculado agora
        }

        # Salva no cache por 2 minutos (120 segundos)
        cache.set(cache_key, dashboard_data, 120)

        return Response(dashboard_data)

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

        # Invalida caches
        self._invalidate_vendas_cache()

        serializer = VendaSerializer(venda)
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

        serializer = VendaSerializer(vendas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def receber(self, request, pk=None):
        """Marca uma venda fiado como paga"""
        venda = self.get_object()

        try:
            venda.receber_pagamento()

            # Invalida caches
            self._invalidate_vendas_cache()

            serializer = VendaSerializer(venda)
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


# ========== AUTENTICAÇÃO ==========

@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login(request):
    """Autentica usuário e retorna token - Rate limited: 5 tentativas por minuto por IP"""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username e password são obrigatórios'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {'error': 'Credenciais inválidas'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Cria ou recupera o token
    token, created = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
    })


@api_view(['POST'])
def logout(request):
    """Remove o token do usuário"""
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Logout realizado com sucesso'})
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def me(request):
    """Retorna informações do usuário autenticado"""
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint para monitoramento"""
    from django.core.cache import cache
    from django.conf import settings

    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0',
    }

    # Testa conexão com banco de dados
    try:
        connection.ensure_connection()
        # Query simples para testar performance
        Cliente.objects.count()
        health_status['database'] = 'connected'
    except Exception as e:
        health_status['database'] = f'error: {str(e)}'
        health_status['status'] = 'unhealthy'

    # Testa cache (Redis ou LocMem)
    try:
        cache_key = 'health_check_test'
        cache_value = f'ok_{timezone.now().timestamp()}'

        # Tenta setar e recuperar
        cache.set(cache_key, cache_value, 30)
        cached = cache.get(cache_key)

        # Converte para string se vier como bytes (Redis)
        if isinstance(cached, bytes):
            cached = cached.decode('utf-8')

        if cached == cache_value:
            # Detecta o tipo de cache
            cache_backend = settings.CACHES['default']['BACKEND']
            if 'redis' in cache_backend.lower():
                cache_type = 'redis'
            elif 'locmem' in cache_backend.lower():
                cache_type = 'locmem'
            else:
                cache_type = 'unknown'

            health_status['cache'] = {
                'status': 'working',
                'backend': cache_type
            }
        else:
            health_status['cache'] = {
                'status': 'error',
                'message': 'cache value mismatch'
            }
    except Exception as e:
        health_status['cache'] = {
            'status': 'error',
            'message': str(e)
        }
        # Cache não é crítico, não muda status geral

    # Verifica caixa aberto
    try:
        caixa_aberto = Caixa.objects.filter(status='ABERTO').exists()
        health_status['caixa_aberto'] = caixa_aberto
    except:
        pass

    status_code = 200 if health_status['status'] == 'healthy' else 503
    return Response(health_status, status=status_code)