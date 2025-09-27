from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReportJob
from .serializers import ReportJobCreateSerializer, ReportJobSerializer
from .services import generate_report_payload, make_dashboard_metrics


class DashboardMetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        loja_id = request.query_params.get("loja")
        metrics = make_dashboard_metrics(loja_id=int(loja_id) if loja_id else None)
        return Response(metrics)


class ReportJobViewSet(viewsets.ModelViewSet):
    queryset = ReportJob.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return ReportJobCreateSerializer
        return ReportJobSerializer

    def get_queryset(self):
        queryset = self.queryset
        loja_id = self.request.query_params.get("loja")
        if loja_id:
            queryset = queryset.filter(loja_id=loja_id)
        return queryset

    def perform_create(self, serializer):
        job = serializer.save(status=ReportJob.Status.PROCESSANDO)
        try:
            payload = generate_report_payload(job.tipo, loja_id=job.loja_id, parametros=job.parametros)
            job.payload = payload
            job.status = ReportJob.Status.CONCLUIDO
            job.mensagem = "Relatório gerado com sucesso"
            job.concluido_em = timezone.now()
        except Exception as exc:  # noqa: BLE001 - capturamos para sinalizar falha ao usuário
            job.status = ReportJob.Status.ERRO
            job.mensagem = f"Erro ao gerar relatório: {exc}"
        finally:
            job.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        job_serializer = ReportJobSerializer(instance=serializer.instance)
        headers = self.get_success_headers(job_serializer.data)
        return Response(job_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
