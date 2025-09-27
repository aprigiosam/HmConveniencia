from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import Loja, TimeStampedModel
from apps.sales.models import Venda


class EmitenteConfig(TimeStampedModel):
    class Ambiente(models.TextChoices):
        HOMOLOGACAO = "HOMOLOG", _("Homologação")
        PRODUCAO = "PROD", _("Produção")

    loja = models.OneToOneField(Loja, on_delete=models.CASCADE, related_name="config_nfe")
    serie = models.PositiveSmallIntegerField(default=1)
    proximo_numero = models.PositiveIntegerField(default=1)
    ambiente = models.CharField(max_length=8, choices=Ambiente.choices, default=Ambiente.HOMOLOGACAO)
    regime_tributario = models.CharField(max_length=20, blank=True)
    inscricao_estadual = models.CharField(max_length=20, blank=True)
    inscricao_municipal = models.CharField(max_length=20, blank=True)
    certificado_nome = models.CharField(max_length=255, blank=True)
    certificado_senha = models.CharField(max_length=255, blank=True)
    certificado_arquivo_b64 = models.TextField(blank=True, help_text="Conteúdo base64 do certificado A1 (.pfx)")
    csc_id = models.CharField(max_length=40, blank=True, help_text="ID do CSC/NFC-e se aplicável")
    csc_token = models.CharField(max_length=40, blank=True)

    class Meta:
        verbose_name = "Configuração NF-e"
        verbose_name_plural = "Configurações NF-e"

    def __str__(self) -> str:
        return f"Config NF-e {self.loja.nome}"


class NotaFiscal(TimeStampedModel):
    class Status(models.TextChoices):
        RASCUNHO = "RASCUNHO", _("Rascunho")
        EM_PROCESSAMENTO = "PROCESSANDO", _("Em processamento")
        AUTORIZADA = "AUTORIZADA", _("Autorizada")
        REJEITADA = "REJEITADA", _("Rejeitada")
        CANCELADA = "CANCELADA", _("Cancelada")

    config = models.ForeignKey(EmitenteConfig, on_delete=models.PROTECT, related_name="notas")
    venda = models.OneToOneField(Venda, on_delete=models.SET_NULL, related_name="nota_fiscal", null=True, blank=True)
    numero = models.PositiveIntegerField()
    serie = models.PositiveSmallIntegerField(default=1)
    chave_acesso = models.CharField(max_length=44, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)
    motivo_status = models.TextField(blank=True)
    xml_assinado = models.TextField(blank=True)
    xml_autorizado = models.TextField(blank=True)
    protocolo_autorizacao = models.CharField(max_length=60, blank=True)
    dh_autorizacao = models.DateTimeField(null=True, blank=True)
    ambiente = models.CharField(max_length=8, choices=EmitenteConfig.Ambiente.choices)
    total_produtos = models.DecimalField(max_digits=13, decimal_places=2, default=0)
    total_notafiscal = models.DecimalField(max_digits=13, decimal_places=2, default=0)
    impostos_totais = models.DecimalField(max_digits=13, decimal_places=2, default=0)
    dados_extra = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "Nota Fiscal"
        verbose_name_plural = "Notas Fiscais"

    def __str__(self) -> str:
        return f"NF-e {self.serie}/{self.numero} ({self.config.loja.nome})"


class NotaFiscalItem(TimeStampedModel):
    nota = models.ForeignKey(NotaFiscal, on_delete=models.CASCADE, related_name="itens")
    produto_nome = models.CharField(max_length=255)
    produto_sku = models.CharField(max_length=60, blank=True)
    ncm = models.CharField(max_length=10, blank=True)
    cfop = models.CharField(max_length=10, blank=True)
    unidade = models.CharField(max_length=10, default="UN")
    quantidade = models.DecimalField(max_digits=13, decimal_places=4)
    valor_unitario = models.DecimalField(max_digits=13, decimal_places=4)
    valor_total = models.DecimalField(max_digits=13, decimal_places=2)
    aliquota_icms = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    aliquota_ipi = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    aliquota_pis = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    aliquota_cofins = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    dados_impostos = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("id",)
        verbose_name = "Item da nota"
        verbose_name_plural = "Itens da nota"

    def __str__(self) -> str:
        return f"Item {self.produto_nome} ({self.quantidade})"


class EventoNotaFiscal(TimeStampedModel):
    class Tipo(models.TextChoices):
        CANCELAMENTO = "CANCELAMENTO", _("Cancelamento")
        CARTA_CORRECAO = "CARTA_CORRECAO", _("Carta de Correção")

    nota = models.ForeignKey(NotaFiscal, on_delete=models.CASCADE, related_name="eventos")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    justificativa = models.TextField()
    protocolo = models.CharField(max_length=60, blank=True)
    xml_evento = models.TextField(blank=True)
    processamento = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.tipo} - NF {self.nota.numero}"
