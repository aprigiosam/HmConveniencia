"""
Models simples para PDV - HMConveniencia
"""

import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Cliente(models.Model):
    """Cliente - para vendas fiado"""

    nome = models.CharField("Nome", max_length=200)
    telefone = models.CharField("Telefone", max_length=20, blank=True)
    cpf = models.CharField("CPF", max_length=14, blank=True, unique=True, null=True)
    endereco = models.TextField("Endereço", blank=True)
    limite_credito = models.DecimalField(
        "Limite de Crédito",
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(
                Decimal("0.00"), message="Limite de crédito não pode ser negativo"
            )
        ],
    )
    ativo = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="clientes",
    )

    class Meta:
        ordering = ["nome"]
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        indexes = [
            models.Index(fields=["ativo"]),
            models.Index(fields=["nome"]),
            models.Index(fields=["empresa", "ativo"]),
        ]

    def __str__(self):
        return self.nome

    def saldo_devedor(self):
        """Retorna o total de vendas pendentes (fiado)"""
        return self.vendas.filter(status_pagamento="PENDENTE").aggregate(
            total=models.Sum("total")
        )["total"] or Decimal("0.00")

    def pode_comprar_fiado(self, valor):
        """Verifica se cliente pode comprar fiado baseado no limite"""
        if self.limite_credito == 0:
            return True  # Sem limite
        saldo = self.saldo_devedor()
        return (saldo + valor) <= self.limite_credito


class Fornecedor(models.Model):
    """Fornecedor - para controle de compras"""

    nome = models.CharField("Nome/Razão Social", max_length=200)
    nome_fantasia = models.CharField("Nome Fantasia", max_length=200, blank=True)
    cnpj = models.CharField("CNPJ", max_length=18, blank=True, unique=True, null=True)
    telefone = models.CharField("Telefone", max_length=20, blank=True)
    email = models.EmailField("Email", blank=True)
    endereco = models.TextField("Endereço", blank=True)
    observacoes = models.TextField("Observações", blank=True)
    ativo = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="fornecedores",
    )

    class Meta:
        ordering = ["nome"]
        verbose_name = "Fornecedor"
        verbose_name_plural = "Fornecedores"
        indexes = [
            models.Index(fields=["ativo"]),
            models.Index(fields=["nome"]),
            models.Index(fields=["empresa", "ativo"]),
        ]

    def __str__(self):
        return self.nome_fantasia if self.nome_fantasia else self.nome

    def total_compras(self):
        """Retorna o total de lotes comprados deste fornecedor"""
        return self.lotes.filter(ativo=True).aggregate(
            total=models.Sum(models.F("quantidade") * models.F("preco_custo_lote"))
        )["total"] or Decimal("0.00")

    def total_lotes(self):
        """Retorna quantidade de lotes ativos deste fornecedor"""
        return self.lotes.filter(ativo=True).count()


class Categoria(models.Model):
    """Categorias de produtos"""

    nome = models.CharField("Nome", max_length=100)
    ativo = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categorias",
    )

    class Meta:
        ordering = ["nome"]
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        constraints = [
            models.UniqueConstraint(
                fields=['nome', 'empresa'],
                name='unique_categoria_por_empresa'
            )
        ]

    def __str__(self):
        return self.nome


class Produto(models.Model):
    """Produto - campos essenciais"""

    nome = models.CharField("Nome", max_length=200)
    marca = models.CharField("Marca", max_length=120, blank=True)
    preco = models.DecimalField(
        "Preço",
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.01"), message="Preço deve ser maior que zero")
        ],
    )
    preco_custo = models.DecimalField(
        "Preço de Custo",
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(
                Decimal("0.00"), message="Preço de custo não pode ser negativo"
            )
        ],
    )
    estoque = models.DecimalField(
        "Estoque",
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(Decimal("0.00"), message="Estoque não pode ser negativo")
        ],
    )
    codigo_barras = models.CharField("Código de Barras", max_length=50, blank=True)
    conteudo_valor = models.DecimalField(
        "Conteúdo",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Quantidade numérica do conteúdo (ex.: 2.0)",
    )
    conteudo_unidade = models.CharField(
        "Unidade do Conteúdo",
        max_length=10,
        blank=True,
        help_text="Unidade do conteúdo (ex.: L, ml, g)",
    )
    data_validade = models.DateField(
        "Data de Validade",
        null=True,
        blank=True,
        help_text="Deixe em branco para produtos sem validade",
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="produtos",
        verbose_name="Categoria",
    )
    fornecedor = models.ForeignKey(
        Fornecedor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="produtos",
        verbose_name="Fornecedor",
    )
    ativo = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="produtos",
    )

    class Meta:
        ordering = ["nome"]
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        indexes = [
            models.Index(fields=["ativo"]),
            models.Index(fields=["codigo_barras"]),
            models.Index(fields=["estoque"]),
            models.Index(fields=["nome"]),
            models.Index(fields=["empresa", "ativo"], name="produto_empresa_ativo_idx"),
        ]

    def __str__(self):
        return self.nome

    def tem_estoque(self, quantidade):
        """Verifica se tem estoque disponível"""
        return self.estoque >= quantidade

    @property
    def margem_lucro(self):
        """Calcula a margem de lucro do produto"""
        if self.preco_custo > 0:
            return ((self.preco - self.preco_custo) / self.preco_custo) * 100
        return Decimal("0.00")

    @property
    def esta_vencido(self):
        """Verifica se o produto está vencido"""
        if not self.data_validade:
            return False
        from django.utils import timezone

        return self.data_validade < timezone.now().date()

    @property
    def dias_para_vencer(self):
        """Retorna quantos dias faltam para vencer (negativo se vencido)"""
        if not self.data_validade:
            return None
        from django.utils import timezone

        delta = self.data_validade - timezone.now().date()
        return delta.days

    @property
    def proximo_vencimento(self):
        """Verifica se está próximo do vencimento (7 dias)"""
        if not self.data_validade:
            return False
        dias = self.dias_para_vencer
        return dias is not None and 0 <= dias <= 7


class Venda(models.Model):
    """Venda realizada"""

    STATUS_CHOICES = [
        ("ABERTA", "Aberta"),
        ("FINALIZADA", "Finalizada"),
        ("CANCELADA", "Cancelada"),
    ]

    FORMA_PAGAMENTO_CHOICES = [
        ("DINHEIRO", "Dinheiro"),
        ("DEBITO", "Débito"),
        ("CREDITO", "Crédito"),
        ("PIX", "PIX"),
        ("FIADO", "Fiado"),
    ]

    STATUS_PAGAMENTO_CHOICES = [
        ("PAGO", "Pago"),
        ("PENDENTE", "Pendente"),
    ]

    numero = models.CharField("Número", max_length=20, unique=True, blank=True)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="vendas",
        verbose_name="Cliente",
    )
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="vendas",
    )
    status = models.CharField(
        "Status", max_length=20, choices=STATUS_CHOICES, default="ABERTA"
    )
    forma_pagamento = models.CharField(
        "Forma de Pagamento", max_length=20, choices=FORMA_PAGAMENTO_CHOICES, blank=True
    )
    status_pagamento = models.CharField(
        "Status Pagamento",
        max_length=20,
        choices=STATUS_PAGAMENTO_CHOICES,
        default="PAGO",
    )
    total = models.DecimalField("Total", max_digits=10, decimal_places=2, default=0)
    desconto = models.DecimalField(
        "Desconto", max_digits=10, decimal_places=2, default=0
    )
    observacoes = models.TextField("Observações", blank=True)
    data_vencimento = models.DateField(
        "Data Vencimento", null=True, blank=True, help_text="Para vendas fiado"
    )
    created_at = models.DateTimeField("Data", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Venda"
        verbose_name_plural = "Vendas"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["status_pagamento"]),
            models.Index(fields=["forma_pagamento"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["data_vencimento"]),
            models.Index(fields=["status", "status_pagamento"]),
            models.Index(fields=["empresa", "-created_at"], name="venda_empresa_created_idx"),
        ]

    def __str__(self):
        return f"Venda {self.numero} - R$ {self.total}"

    def save(self, *args, **kwargs):
        # Gera número automático se não existir
        if not self.numero:
            from django.utils import timezone

            hoje = timezone.now()
            # Formato: V2025012314-A3F2 (mais curto + previne colisões com UUID)
            short_uuid = str(uuid.uuid4())[:4].upper()
            self.numero = f'V{hoje.strftime("%Y%m%d%H")}-{short_uuid}'
        super().save(*args, **kwargs)

    def calcular_total(self):
        """Calcula o total da venda baseado nos itens"""
        # Otimizado: usa aggregate para evitar N+1 queries
        total = self.itens.aggregate(total=models.Sum('subtotal'))['total'] or Decimal('0.00')
        self.total = total - self.desconto
        self.save()

    def finalizar(self, forma_pagamento, cliente_id=None, data_vencimento=None):
        """Finaliza a venda e baixa o estoque"""
        if self.status != "ABERTA":
            raise ValueError("Venda já foi finalizada ou cancelada")

        self.forma_pagamento = forma_pagamento

        # Se for fiado, marca como pendente
        if forma_pagamento == "FIADO":
            if not cliente_id:
                raise ValueError("Cliente é obrigatório para vendas fiado")
            self.cliente_id = cliente_id
            self.status_pagamento = "PENDENTE"
            self.data_vencimento = data_vencimento
        else:
            self.status_pagamento = "PAGO"

        self.status = "FINALIZADA"
        self.save()

        # Baixa estoque usando FEFO (First Expired, First Out)
        from .services.lote_service import LoteService

        for item in self.itens.all():
            produto = item.produto

            # Verifica se produto usa sistema de lotes
            if LoteService.produto_usa_lotes(produto):
                # Usa FEFO para baixar dos lotes
                try:
                    lotes_afetados = LoteService.baixar_estoque_fefo(
                        produto, item.quantidade
                    )
                    # Log para debug
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.info(
                        f"Venda {self.numero}: FEFO aplicado em {produto.nome}. Lotes: {lotes_afetados}"
                    )
                except ValueError as e:
                    # Se falhar, reverte a venda
                    self.status = "ABERTA"
                    self.save()
                    raise e
            else:
                # Produto sem lotes: baixa direta do estoque
                produto.estoque -= item.quantidade
                produto.save()

    def receber_pagamento(self):
        """Marca a venda como paga"""
        if self.status_pagamento == "PAGO":
            raise ValueError("Venda já está paga")
        self.status_pagamento = "PAGO"
        self.save()


class ItemVenda(models.Model):
    """Item de uma venda"""

    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.DecimalField("Quantidade", max_digits=10, decimal_places=2)
    preco_unitario = models.DecimalField(
        "Preço Unitário", max_digits=10, decimal_places=2
    )
    subtotal = models.DecimalField(
        "Subtotal", max_digits=10, decimal_places=2, default=0
    )

    class Meta:
        verbose_name = "Item da Venda"
        verbose_name_plural = "Itens da Venda"

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome}"

    def save(self, *args, **kwargs):
        # Calcula subtotal automaticamente
        self.subtotal = self.quantidade * self.preco_unitario
        super().save(*args, **kwargs)


class Caixa(models.Model):
    """Registra a abertura e fechamento do caixa"""

    STATUS_CHOICES = [
        ("ABERTO", "Aberto"),
        ("FECHADO", "Fechado"),
    ]

    data_abertura = models.DateTimeField("Data de Abertura", auto_now_add=True)
    data_fechamento = models.DateTimeField("Data de Fechamento", null=True, blank=True)
    valor_inicial = models.DecimalField(
        "Valor Inicial", max_digits=10, decimal_places=2
    )
    valor_final_sistema = models.DecimalField(
        "Valor Final (Sistema)", max_digits=10, decimal_places=2, null=True, blank=True
    )
    valor_final_informado = models.DecimalField(
        "Valor Final (Informado)",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    diferenca = models.DecimalField(
        "Diferença", max_digits=10, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(
        "Status", max_length=10, choices=STATUS_CHOICES, default="ABERTO"
    )
    observacoes = models.TextField("Observações", blank=True)
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="caixas",
    )

    class Meta:
        ordering = ["-data_abertura"]
        verbose_name = "Caixa"
        verbose_name_plural = "Caixas"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["empresa", "status", "-data_abertura"], name="caixa_empresa_status_idx"),
        ]

    def __str__(self):
        return f'Caixa de {self.data_abertura.strftime("%d/%m/%Y %H:%M")}'


class MovimentacaoCaixa(models.Model):
    """Registra sangrias e suprimentos do caixa"""

    TIPO_CHOICES = [
        ("SANGRIA", "Sangria"),
        ("SUPRIMENTO", "Suprimento"),
    ]

    caixa = models.ForeignKey(
        Caixa, on_delete=models.CASCADE, related_name="movimentacoes"
    )
    tipo = models.CharField("Tipo", max_length=10, choices=TIPO_CHOICES)
    valor = models.DecimalField("Valor", max_digits=10, decimal_places=2)
    descricao = models.CharField("Descrição", max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="movimentacoes_caixa",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Movimentação de Caixa"
        verbose_name_plural = "Movimentações de Caixa"
        indexes = [
            models.Index(fields=["empresa", "-created_at"], name="mov_caixa_empresa_idx"),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - R$ {self.valor}"


class Alerta(models.Model):
    """Alertas e notificações do sistema"""

    TIPO_CHOICES = [
        ("LIMITE_CREDITO", "Limite de Crédito"),
        ("PRODUTO_VENCENDO", "Produto Vencendo"),
        ("PRODUTO_VENCIDO", "Produto Vencido"),
        ("ESTOQUE_BAIXO", "Estoque Baixo"),
        ("ESTOQUE_ZERADO", "Estoque Zerado"),
        ("PRODUTO_SEM_PRECO", "Produto sem preço"),
        ("CONTA_VENCIDA", "Conta Vencida"),
        ("DIFERENCA_CAIXA", "Diferença de Caixa"),
    ]

    PRIORIDADE_CHOICES = [
        ("BAIXA", "Baixa"),
        ("MEDIA", "Média"),
        ("ALTA", "Alta"),
        ("CRITICA", "Crítica"),
    ]

    tipo = models.CharField("Tipo", max_length=20, choices=TIPO_CHOICES)
    prioridade = models.CharField(
        "Prioridade", max_length=10, choices=PRIORIDADE_CHOICES, default="MEDIA"
    )
    titulo = models.CharField("Título", max_length=200)
    mensagem = models.TextField("Mensagem")
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="alertas",
    )

    # Relacionamentos opcionais (para rastreabilidade)
    cliente = models.ForeignKey(
        Cliente, on_delete=models.CASCADE, null=True, blank=True, related_name="alertas"
    )
    produto = models.ForeignKey(
        Produto, on_delete=models.CASCADE, null=True, blank=True, related_name="alertas"
    )
    venda = models.ForeignKey(
        Venda, on_delete=models.CASCADE, null=True, blank=True, related_name="alertas"
    )
    caixa = models.ForeignKey(
        Caixa, on_delete=models.CASCADE, null=True, blank=True, related_name="alertas"
    )
    lote = models.ForeignKey(
        "Lote",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="alertas",
        verbose_name="Lote",
    )

    # Controle
    lido = models.BooleanField("Lido", default=False)
    resolvido = models.BooleanField("Resolvido", default=False)
    notificado = models.BooleanField("Notificado", default=False)  # Via WhatsApp/Email

    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    resolvido_em = models.DateTimeField("Resolvido em", null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"
        indexes = [
            models.Index(fields=["tipo", "resolvido"]),
            models.Index(fields=["lido"]),
            models.Index(fields=["prioridade", "-created_at"]),
            models.Index(fields=["empresa", "-created_at"], name="alerta_empresa_idx"),
        ]

    def __str__(self):
        return f"[{self.get_prioridade_display()}] {self.titulo}"

    def marcar_como_lido(self):
        """Marca o alerta como lido"""
        self.lido = True
        self.save(update_fields=["lido"])

    def resolver(self):
        """Marca o alerta como resolvido"""
        from django.utils import timezone

        self.resolvido = True
        self.resolvido_em = timezone.now()
        self.save(update_fields=["resolvido", "resolvido_em"])


class Lote(models.Model):
    """Lote de produtos - controle de validade por lote"""

    produto = models.ForeignKey(
        Produto, on_delete=models.CASCADE, related_name="lotes", verbose_name="Produto"
    )
    numero_lote = models.CharField(
        "Número do Lote",
        max_length=100,
        blank=True,
        help_text="Código do lote (opcional)",
    )
    quantidade = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(
                Decimal("0.00"), message="Quantidade não pode ser negativa"
            )
        ],
    )
    data_validade = models.DateField(
        "Data de Validade",
        null=True,
        blank=True,
        help_text="Data de vencimento do lote",
    )
    data_entrada = models.DateField(
        "Data de Entrada", auto_now_add=True, help_text="Data de cadastro do lote"
    )
    fornecedor = models.ForeignKey(
        "Fornecedor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lotes",
        verbose_name="Fornecedor",
        help_text="Fornecedor deste lote",
    )
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="lotes",
    )
    preco_custo_lote = models.DecimalField(
        "Preço de Custo do Lote",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Preço de custo específico deste lote (opcional)",
        validators=[
            MinValueValidator(Decimal("0.00"), message="Preço não pode ser negativo")
        ],
    )
    observacoes = models.TextField("Observações", blank=True)
    ativo = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        ordering = ["data_validade", "data_entrada"]  # FEFO: First Expired, First Out
        verbose_name = "Lote"
        verbose_name_plural = "Lotes"
        indexes = [
            models.Index(fields=["produto", "ativo"]),
            models.Index(fields=["data_validade"]),
            models.Index(fields=["numero_lote"]),
            models.Index(fields=["produto", "data_validade", "ativo"]),
            models.Index(fields=["empresa", "ativo"], name="lote_empresa_ativo_idx"),
        ]

    def __str__(self):
        lote_info = f" - Lote {self.numero_lote}" if self.numero_lote else ""
        validade_info = (
            f" - Vence {self.data_validade.strftime('%d/%m/%Y')}"
            if self.data_validade
            else ""
        )
        return f"{self.produto.nome}{lote_info}{validade_info} ({self.quantidade} un)"

    @property
    def esta_vencido(self):
        """Verifica se o lote está vencido"""
        if not self.data_validade:
            return False
        from django.utils import timezone

        return self.data_validade < timezone.now().date()

    @property
    def dias_para_vencer(self):
        """Retorna quantos dias faltam para vencer (negativo se vencido)"""
        if not self.data_validade:
            return None
        from django.utils import timezone

        delta = self.data_validade - timezone.now().date()
        return delta.days

    @property
    def proximo_vencimento(self):
        """Verifica se está próximo do vencimento (7 dias)"""
        if not self.data_validade:
            return False
        dias = self.dias_para_vencer
        return dias is not None and 0 <= dias <= 7

    def tem_estoque(self, quantidade_solicitada):
        """Verifica se o lote tem quantidade suficiente"""
        return self.quantidade >= quantidade_solicitada and self.ativo

    def baixar_estoque(self, quantidade_vendida):
        """Reduz o estoque do lote"""
        if not self.tem_estoque(quantidade_vendida):
            raise ValueError(
                f"Estoque insuficiente no lote. Disponível: {self.quantidade}"
            )

        self.quantidade -= quantidade_vendida
        self.save(update_fields=["quantidade", "updated_at"])

        # Desativa o lote se quantidade zerou
        if self.quantidade == 0:
            self.ativo = False
        self.save(update_fields=["ativo", "updated_at"])


class InventarioSessao(models.Model):
    STATUS_CHOICES = [
        ("ABERTO", "Aberto"),
        ("EM_ANDAMENTO", "Em andamento"),
        ("FINALIZADO", "Finalizado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        "fiscal.Empresa",
        on_delete=models.CASCADE,
        related_name="inventarios",
    )
    titulo = models.CharField(max_length=120)
    responsavel = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ABERTO")
    observacoes = models.TextField(blank=True)
    iniciado_em = models.DateTimeField(auto_now_add=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-iniciado_em"]
        verbose_name = "Inventário"
        verbose_name_plural = "Inventários"

    def __str__(self):
        return f"Inventário {self.titulo} ({self.get_status_display()})"


class InventarioItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sessao = models.ForeignKey(
        InventarioSessao,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    produto = models.ForeignKey(
        Produto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventarios",
    )
    codigo_barras = models.CharField(max_length=50, blank=True)
    descricao = models.CharField(max_length=200, blank=True)
    quantidade_sistema = models.DecimalField(
        max_digits=14, decimal_places=4, default=Decimal("0")
    )
    quantidade_contada = models.DecimalField(
        max_digits=14, decimal_places=4, default=Decimal("0")
    )
    custo_informado = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    validade_informada = models.DateField(null=True, blank=True)
    observacao = models.CharField(max_length=255, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["descricao"]
        verbose_name = "Item de Inventário"
        verbose_name_plural = "Itens de Inventário"

    @property
    def diferenca(self) -> Decimal:
        return (self.quantidade_contada or Decimal("0")) - (
            self.quantidade_sistema or Decimal("0")
        )

    def ajustar_produto(self):
        if not self.produto:
            return None

        diferenca = self.diferenca
        if diferenca == 0:
            return None

        produto = self.produto
        produto.estoque = (produto.estoque or Decimal("0")) + diferenca
        if self.custo_informado and self.custo_informado > 0:
            produto.preco_custo = self.custo_informado
        produto.save(update_fields=["estoque", "preco_custo", "updated_at"])

        return diferenca
