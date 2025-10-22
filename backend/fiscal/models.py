import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class AmbienteChoices(models.TextChoices):
    HOMOLOGACAO = "HOMOLOGACAO", "Homologação"
    PRODUCAO = "PRODUCAO", "Produção"


class Empresa(models.Model):
    """
    Representa um estabelecimento (CNPJ) responsável por emissões fiscais.
    Projetado como base para multi-tenant, mesmo operando single-tenant hoje.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    razao_social = models.CharField("Razão Social", max_length=255)
    nome_fantasia = models.CharField("Nome Fantasia", max_length=255, blank=True)
    cnpj = models.CharField("CNPJ", max_length=14, unique=True)
    inscricao_estadual = models.CharField("Inscrição Estadual", max_length=20, blank=True)
    inscricao_municipal = models.CharField(
        "Inscrição Municipal", max_length=20, blank=True
    )
    ambiente = models.CharField(
        "Ambiente SEFAZ",
        max_length=20,
        choices=AmbienteChoices.choices,
        default=AmbienteChoices.HOMOLOGACAO,
    )
    certificado_a1 = models.BinaryField(
        "Certificado A1 (.pfx) em binário", blank=True, null=True
    )
    senha_certificado = models.CharField(
        "Senha do Certificado", max_length=255, blank=True
    )
    certificado_validade = models.DateTimeField(
        "Validade do Certificado", null=True, blank=True
    )
    csc_id = models.CharField("CSC ID (IDToken)", max_length=20, blank=True)
    csc_token = models.CharField("CSC Token", max_length=120, blank=True)
    email_contato = models.EmailField("Email para alertas", blank=True)
    telefone_contato = models.CharField("Telefone", max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["razao_social"]
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    def __str__(self):
        return f"{self.razao_social} ({self.cnpj})"


class NotaTipo(models.TextChoices):
    NFE = "NFE", "NF-e"
    NFCE = "NFCE", "NFC-e"


class NotaModelo(models.TextChoices):
    MODELO_55 = "55", "55 (NF-e)"
    MODELO_65 = "65", "65 (NFC-e)"


class NotaStatus(models.TextChoices):
    EM_PROCESSAMENTO = "EM_PROCESSAMENTO", "Em Processamento"
    AUTORIZADA = "AUTORIZADA", "Autorizada"
    REJEITADA = "REJEITADA", "Rejeitada"
    CANCELADA = "CANCELADA", "Cancelada"


class NotaFiscal(models.Model):
    """Metadados de NF-e/NFC-e importadas ou emitidas."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        "fiscal.Empresa", on_delete=models.CASCADE, related_name="notas"
    )
    tipo = models.CharField("Tipo", max_length=4, choices=NotaTipo.choices)
    modelo = models.CharField("Modelo", max_length=2, choices=NotaModelo.choices)
    serie = models.PositiveIntegerField("Série")
    numero = models.PositiveIntegerField("Número")
    chave_acesso = models.CharField("Chave de Acesso", max_length=44)
    status = models.CharField(
        "Status", max_length=20, choices=NotaStatus.choices, default=NotaStatus.EM_PROCESSAMENTO
    )
    ambiente = models.CharField(
        "Ambiente", max_length=20, choices=AmbienteChoices.choices
    )
    protocolo = models.CharField("Protocolo", max_length=100, blank=True)
    motivo_rejeicao = models.TextField("Motivo da Rejeição", blank=True)
    xml_assinado = models.TextField("XML Assinado", blank=True)
    emitente_documento = models.CharField(
        "Emitente Documento", max_length=14, blank=True
    )
    emitente_nome = models.CharField("Emitente Nome", max_length=255, blank=True)
    destinatario_documento = models.CharField(
        "Destinatário Documento", max_length=14, blank=True
    )
    destinatario_nome = models.CharField("Destinatário Nome", max_length=255, blank=True)
    valor_produtos = models.DecimalField(
        "Valor dos Produtos",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    valor_total = models.DecimalField(
        "Valor Total",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    valor_descontos = models.DecimalField(
        "Valor Descontos",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    data_emissao = models.DateTimeField("Data de Emissão", null=True, blank=True)
    data_autorizacao = models.DateTimeField(
        "Data de Autorização", null=True, blank=True
    )
    fornecedor = models.ForeignKey(
        "core.Fornecedor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notas_fiscais",
    )
    cliente = models.ForeignKey(
        "core.Cliente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notas_fiscais",
    )
    venda = models.OneToOneField(
        "core.Venda",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="nota_fiscal",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data_emissao", "-created_at"]
        verbose_name = "Nota Fiscal"
        verbose_name_plural = "Notas Fiscais"
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "chave_acesso"],
                name="nota_fiscal_unique_empresa_chave",
            ),
            models.UniqueConstraint(
                fields=["empresa", "modelo", "serie", "numero"],
                name="nota_fiscal_unique_empresa_modelo_serie_numero",
            ),
        ]
        indexes = [
            models.Index(fields=["empresa", "-created_at"], name="nota_empresa_created_idx"),
            models.Index(fields=["status"], name="nota_status_idx"),
            models.Index(fields=["ambiente"], name="nota_ambiente_idx"),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} {self.numero}/{self.serie} - {self.chave_acesso}"


class NotaItem(models.Model):
    """Itens de uma nota fiscal (entrada ou saída)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nota = models.ForeignKey(
        "fiscal.NotaFiscal", on_delete=models.CASCADE, related_name="itens"
    )
    produto = models.ForeignKey(
        "core.Produto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notas_itens",
    )
    codigo_produto = models.CharField("Código", max_length=60, blank=True)
    descricao = models.CharField("Descrição", max_length=255)
    ncm = models.CharField("NCM", max_length=8, blank=True)
    cfop = models.CharField("CFOP", max_length=4, blank=True)
    cest = models.CharField("CEST", max_length=7, blank=True)
    unidade = models.CharField("Unidade", max_length=6, blank=True)
    quantidade = models.DecimalField(
        "Quantidade",
        max_digits=14,
        decimal_places=4,
        validators=[MinValueValidator(Decimal("0.0000"))],
    )
    valor_unitario = models.DecimalField(
        "Valor Unitário",
        max_digits=14,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("0.000001"))],
    )
    valor_total = models.DecimalField(
        "Valor Total",
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    valor_desconto = models.DecimalField(
        "Valor Desconto",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Item de Nota"
        verbose_name_plural = "Itens de Nota"
        indexes = [
            models.Index(fields=["nota"], name="nota_item_nota_idx"),
            models.Index(fields=["produto"], name="nota_item_produto_idx"),
        ]

    def __str__(self):
        return f"{self.descricao} ({self.quantidade} {self.unidade})"


class EstoqueOrigem(models.TextChoices):
    ENTRADA = "ENTRADA", "Entrada"
    VENDA = "VENDA", "Venda"
    AJUSTE = "AJUSTE", "Ajuste"
    DEVOLUCAO = "DEVOLUCAO", "Devolução"
    TRANSFERENCIA = "TRANSFERENCIA", "Transferência"


class EstoqueMovimento(models.Model):
    """Histórico de movimentações de estoque vinculado a documentos fiscais."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        "fiscal.Empresa", on_delete=models.CASCADE, related_name="movimentos_estoque"
    )
    produto = models.ForeignKey(
        "core.Produto",
        on_delete=models.PROTECT,
        related_name="movimentos_estoque",
    )
    nota = models.ForeignKey(
        "fiscal.NotaFiscal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentos_estoque",
    )
    origem = models.CharField(
        "Origem", max_length=15, choices=EstoqueOrigem.choices
    )
    quantidade = models.DecimalField(
        "Quantidade",
        max_digits=14,
        decimal_places=4,
    )
    custo_unitario = models.DecimalField(
        "Custo Unitário",
        max_digits=14,
        decimal_places=4,
        default=Decimal("0.00"),
    )
    saldo_resultante = models.DecimalField(
        "Saldo Resultante",
        max_digits=14,
        decimal_places=4,
        null=True,
        blank=True,
    )
    observacao = models.CharField("Observação", max_length=255, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Movimentação de Estoque"
        verbose_name_plural = "Movimentações de Estoque"
        indexes = [
            models.Index(
                fields=["empresa", "produto", "-criado_em"],
                name="estoque_empresa_produto_idx",
            ),
            models.Index(fields=["origem"], name="estoque_origem_idx"),
        ]

    def __str__(self):
        sinal = "+" if self.quantidade >= 0 else "-"
        return f"{sinal}{abs(self.quantidade)} {self.produto.nome} ({self.get_origem_display()})"


class XMLDocumentoTipo(models.TextChoices):
    NOTA = "NOTA", "Nota Fiscal"
    PROCNFE = "PROCNFE", "procNFe"
    EVENTO = "EVENTO", "Evento"


class XMLArmazenado(models.Model):
    """Armazenamento dos XMLs fiscais (entrada, saída, eventos)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nota = models.OneToOneField(
        "fiscal.NotaFiscal",
        on_delete=models.CASCADE,
        related_name="xml_armazenado",
        null=True,
        blank=True,
    )
    tipo_documento = models.CharField(
        "Tipo de Documento",
        max_length=12,
        choices=XMLDocumentoTipo.choices,
        default=XMLDocumentoTipo.NOTA,
    )
    ambiente = models.CharField(
        "Ambiente", max_length=20, choices=AmbienteChoices.choices, blank=True
    )
    chave_acesso = models.CharField("Chave de Acesso", max_length=44, blank=True)
    xml_texto = models.TextField("XML (texto completo)")
    storage_path = models.CharField("Storage Path", max_length=255, blank=True)
    hash_sha1 = models.CharField("Hash SHA1", max_length=40, blank=True)
    hash_sha256 = models.CharField("Hash SHA256", max_length=64, blank=True)
    importado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "XML Armazenado"
        verbose_name_plural = "XMLs Armazenados"
        indexes = [
            models.Index(fields=["chave_acesso"], name="xml_chave_idx"),
            models.Index(fields=["tipo_documento"], name="xml_tipo_idx"),
        ]

    def __str__(self):
        chave = self.chave_acesso or "sem chave"
        return f"XML {self.get_tipo_documento_display()} {chave}"
