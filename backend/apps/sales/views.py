from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import Venda, ItemVenda, PagamentoVenda, SessaoPDV, MovimentacaoCaixa
from .serializers import (
    VendaSerializer, VendaCreateSerializer, ItemVendaSerializer, PagamentoVendaSerializer,
    SessaoPDVSerializer, MovimentacaoCaixaSerializer, SessaoFechamentoSerializer,
    SessaoReaberturaSerializer
)
from .services import finalizar_venda
from .services.relatorio_service import RelatorioService
from .services.export_service import ExportService
from django.http import HttpResponse


class VendaViewSet(viewsets.ModelViewSet):
    queryset = Venda.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return VendaCreateSerializer
        return VendaSerializer

    def get_queryset(self):
        queryset = Venda.objects.all()
        status_param = self.request.query_params.get('status', None)
        cliente = self.request.query_params.get('cliente', None)
        loja = self.request.query_params.get('loja', None)

        if status_param is not None:
            queryset = queryset.filter(status=status_param)

        if cliente is not None:
            queryset = queryset.filter(cliente_id=cliente)

        if loja is not None:
            queryset = queryset.filter(loja_id=loja)

        return queryset

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        venda = self.get_object()
        if venda.status != Venda.Status.PENDENTE:
            return Response({'error': 'Venda não pode ser finalizada'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            finalizar_venda(venda, status_anterior=Venda.Status.PENDENTE)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages)

        return Response({'status': 'Venda finalizada'})

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        venda = self.get_object()
        if venda.status == Venda.Status.PENDENTE:
            venda.status = Venda.Status.CANCELADA
            venda.save()
            return Response({'status': 'Venda cancelada'})
        return Response({'error': 'Venda não pode ser cancelada'}, status=status.HTTP_400_BAD_REQUEST)

    def perform_update(self, serializer):
        status_anterior = serializer.instance.status
        with transaction.atomic():
            venda = serializer.save()
            if status_anterior != Venda.Status.FINALIZADA and venda.status == Venda.Status.FINALIZADA:
                try:
                    finalizar_venda(venda, status_anterior=status_anterior)
                except DjangoValidationError as exc:
                    raise DRFValidationError(exc.messages)


class ItemVendaViewSet(viewsets.ModelViewSet):
    queryset = ItemVenda.objects.all()
    serializer_class = ItemVendaSerializer
    permission_classes = [IsAuthenticated]


class PagamentoVendaViewSet(viewsets.ModelViewSet):
    queryset = PagamentoVenda.objects.all()
    serializer_class = PagamentoVendaSerializer
    permission_classes = [IsAuthenticated]


class SessaoPDVViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar sessões de PDV
    Inclui endpoints para abertura, fechamento e consulta de sessões
    """
    queryset = SessaoPDV.objects.all()
    serializer_class = SessaoPDVSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = SessaoPDV.objects.all()
        loja = self.request.query_params.get('loja', None)
        status_param = self.request.query_params.get('status', None)
        responsavel = self.request.query_params.get('responsavel', None)

        if loja:
            queryset = queryset.filter(loja_id=loja)

        if status_param:
            queryset = queryset.filter(status=status_param)

        if responsavel:
            queryset = queryset.filter(responsavel_id=responsavel)

        return queryset

    @action(detail=False, methods=['get'])
    def sessao_aberta(self, request):
        """
        Retorna a sessão aberta da loja especificada
        Query params: ?loja=<loja_id>
        """
        loja_id = request.query_params.get('loja')

        if not loja_id:
            return Response(
                {'error': 'O parâmetro loja é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            sessao = SessaoPDV.objects.filter(
                loja_id=loja_id,
                status=SessaoPDV.Status.ABERTA
            ).first()

            if not sessao:
                return Response(
                    {'detail': 'Nenhuma sessão aberta encontrada'},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(sessao)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def fechar(self, request, pk=None):
        """
        Fecha uma sessão de PDV
        Body: {
            "saldo_fechamento_real": 1500.00,
            "observacoes": "Fechamento normal"
        }
        """
        sessao = self.get_object()

        if not sessao.esta_aberta:
            return Response(
                {'error': 'Sessão já está fechada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valida dados de fechamento
        fechamento_serializer = SessaoFechamentoSerializer(data=request.data)
        if not fechamento_serializer.is_valid():
            return Response(
                fechamento_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Fecha a sessão
            sessao.fechar(
                saldo_fechamento_real=fechamento_serializer.validated_data['saldo_fechamento_real'],
                observacoes=fechamento_serializer.validated_data.get('observacoes', '')
            )

            # Retorna sessão fechada
            serializer = self.get_serializer(sessao)
            return Response({
                'message': 'Sessão fechada com sucesso',
                'sessao': serializer.data
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao fechar sessão: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def relatorio(self, request, pk=None):
        """
        Retorna relatório detalhado da sessão com vendas e movimentações
        """
        sessao = self.get_object()

        from django.db.models import Sum, Count

        # Vendas
        vendas_data = sessao.vendas.filter(status=Venda.Status.FINALIZADA).aggregate(
            total_vendas=Sum('valor_total'),
            quantidade_vendas=Count('id')
        )

        # Movimentações
        movimentacoes_data = {
            'sangrias': list(sessao.movimentacoes_caixa.filter(tipo='SANGRIA').values(
                'id', 'valor', 'motivo', 'data_hora', 'responsavel__username'
            )),
            'reforcos': list(sessao.movimentacoes_caixa.filter(tipo='REFORCO').values(
                'id', 'valor', 'motivo', 'data_hora', 'responsavel__username'
            ))
        }

        # Resumo
        resumo = {
            'saldo_inicial': float(sessao.saldo_inicial),
            'total_vendas': float(vendas_data['total_vendas'] or 0),
            'quantidade_vendas': vendas_data['quantidade_vendas'],
            'saldo_teorico': float(sessao.calcular_saldo_teorico()),
            'saldo_real': float(sessao.saldo_fechamento_real),
            'diferenca': float(sessao.diferenca_caixa) if not sessao.esta_aberta else None,
            'status': sessao.status
        }

        return Response({
            'sessao': SessaoPDVSerializer(sessao).data,
            'resumo': resumo,
            'vendas': vendas_data,
            'movimentacoes': movimentacoes_data
        })

    @action(detail=True, methods=['get'])
    def relatorio_x(self, request, pk=None):
        """
        Gera relatório X (parcial) da sessão
        Não fecha a sessão, apenas consulta
        """
        sessao = self.get_object()

        try:
            relatorio = RelatorioService.gerar_relatorio_x(sessao)
            return Response(relatorio)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def relatorio_z(self, request, pk=None):
        """
        Gera relatório Z (fechamento) da sessão
        Deve ser gerado após o fechamento
        """
        sessao = self.get_object()

        try:
            relatorio = RelatorioService.gerar_relatorio_z(sessao)
            return Response(relatorio)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def validar_fechamento(self, request, pk=None):
        """
        Valida se a sessão pode ser fechada
        Retorna avisos e bloqueios
        """
        sessao = self.get_object()
        validacao = RelatorioService.validar_fechamento(sessao)
        return Response(validacao)

    @action(detail=True, methods=['get'], url_path='exportar/pdf')
    def exportar_pdf(self, request, pk=None):
        """
        Exporta relatório em PDF
        Query params: ?tipo=X ou ?tipo=Z (padrão: Z)
        """
        sessao = self.get_object()
        tipo = request.query_params.get('tipo', 'Z').upper()

        try:
            # Gera relatório
            if tipo == 'X':
                relatorio = RelatorioService.gerar_relatorio_x(sessao)
            else:
                relatorio = RelatorioService.gerar_relatorio_z(sessao)

            # Exporta para PDF
            pdf_buffer = ExportService.exportar_relatorio_pdf(relatorio)

            # Retorna como download
            response = HttpResponse(
                pdf_buffer.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="relatorio-{tipo}-{sessao.codigo}.pdf"'
            return response

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='exportar/excel')
    def exportar_excel(self, request, pk=None):
        """
        Exporta relatório em Excel (XLSX)
        Query params: ?tipo=X ou ?tipo=Z (padrão: Z)
        """
        sessao = self.get_object()
        tipo = request.query_params.get('tipo', 'Z').upper()

        try:
            # Gera relatório
            if tipo == 'X':
                relatorio = RelatorioService.gerar_relatorio_x(sessao)
            else:
                relatorio = RelatorioService.gerar_relatorio_z(sessao)

            # Exporta para Excel
            excel_buffer = ExportService.exportar_relatorio_excel(relatorio)

            # Retorna como download
            response = HttpResponse(
                excel_buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="relatorio-{tipo}-{sessao.codigo}.xlsx"'
            return response

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='exportar/csv')
    def exportar_csv(self, request, pk=None):
        """
        Exporta relatório em CSV
        Query params: ?tipo=X ou ?tipo=Z (padrão: Z)
        """
        sessao = self.get_object()
        tipo = request.query_params.get('tipo', 'Z').upper()

        try:
            # Gera relatório
            if tipo == 'X':
                relatorio = RelatorioService.gerar_relatorio_x(sessao)
            else:
                relatorio = RelatorioService.gerar_relatorio_z(sessao)

            # Exporta para CSV
            csv_buffer = ExportService.exportar_relatorio_csv(relatorio)

            # Retorna como download
            response = HttpResponse(
                csv_buffer.getvalue(),
                content_type='text/csv; charset=utf-8'
            )
            response['Content-Disposition'] = f'attachment; filename="relatorio-{tipo}-{sessao.codigo}.csv"'
            return response

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reabrir(self, request, pk=None):
        """
        Reabre uma sessão fechada (rescue session)
        Body: {
            "motivo": "Descrição do motivo da reabertura (mínimo 10 caracteres)"
        }

        Usado para:
        - Correções de erros no fechamento
        - Vendas esquecidas
        - Ajustes necessários após o fechamento
        """
        sessao = self.get_object()

        if sessao.esta_aberta:
            return Response(
                {'error': 'Sessão já está aberta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valida dados de reabertura
        reabertura_serializer = SessaoReaberturaSerializer(data=request.data)
        if not reabertura_serializer.is_valid():
            return Response(
                reabertura_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Reabre a sessão
            sessao.reabrir(
                responsavel=request.user,
                motivo=reabertura_serializer.validated_data['motivo']
            )

            # Retorna sessão reaberta
            serializer = self.get_serializer(sessao)
            return Response({
                'message': 'Sessão reaberta com sucesso',
                'aviso': 'Esta é uma sessão de recuperação. Registre todas as alterações necessárias.',
                'sessao': serializer.data
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao reabrir sessão: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MovimentacaoCaixaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar movimentações de caixa (sangrias e reforços)
    """
    queryset = MovimentacaoCaixa.objects.all()
    serializer_class = MovimentacaoCaixaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MovimentacaoCaixa.objects.all()
        sessao = self.request.query_params.get('sessao', None)
        tipo = self.request.query_params.get('tipo', None)

        if sessao:
            queryset = queryset.filter(sessao_id=sessao)

        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset

    def perform_create(self, serializer):
        """Associa o usuário logado como responsável"""
        serializer.save(responsavel=self.request.user)
