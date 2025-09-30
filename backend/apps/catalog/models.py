"""
Modelos consolidados do catálogo de produtos
Inclui: Produtos, Categorias, Fornecedores, Combos, Favoritos e Preços
"""

from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

from apps.core.models import Loja, TimeStampedModel, Cliente

User = get_user_model()


# ========================================
# PRODUTOS BÁSICOS
# ========================================

class Categoria(TimeStampedModel):
    nome = models.CharField(max_length=150, unique=True)
    descricao = models.TextField(blank=True)
    categoria_pai = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategorias",
    )

    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class Fornecedor(TimeStampedModel):
    cnpj_cpf = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    responsavel = models.CharField(max_length=255, blank=True)
    contatos = models.JSONField(default=list, blank=True)
    condicoes_pagamento = models.TextField(blank=True)
    prazo_medio_entrega_dias = models.PositiveIntegerField(default=0)
    observacoes = models.TextField(blank=True)
    endereco = models.JSONField(default=dict, blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class Produto(TimeStampedModel):
    UNIDADE_PADRAO = "UN"

    sku = models.CharField(max_length=50, unique=True)
    codigo_barras = models.CharField(max_length=64, unique=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="produtos")
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.PROTECT, related_name="produtos")
    unidade = models.CharField(max_length=10, default=UNIDADE_PADRAO)
    preco_custo = models.DecimalField(max_digits=10, decimal_places=2)
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2)
    estoque_minimo = models.PositiveIntegerField(default=0)
    controla_vencimento = models.BooleanField(default=False)
    dias_alerta_vencimento = models.PositiveIntegerField(default=0)
    permite_venda_vencido = models.BooleanField(default=False)
    desconto_produto_vencido = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class LoteProduto(TimeStampedModel):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="lotes")
    loja = models.ForeignKey(Loja, on_delete=models.CASCADE, related_name="lotes")
    numero_lote = models.CharField(max_length=100)
    data_vencimento = models.DateField(null=True, blank=True)
    quantidade = models.PositiveIntegerField(default=0)
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ("data_vencimento", "numero_lote")
        unique_together = (("produto", "numero_lote"),)

    def __str__(self) -> str:
        return f"{self.numero_lote} - {self.produto.nome}"


# ========================================
# COMBOS E PRODUTOS COMPOSTOS
# ========================================

class ProdutoCombo(TimeStampedModel):
    """Combo de produtos com preço especial"""

    class TipoCombo(models.TextChoices):
        FIXO = 'FIXO', 'Fixo'
        FLEXIVEL = 'FLEXIVEL', 'Flexível'

    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    sku = models.CharField(max_length=50, unique=True)
    tipo = models.CharField(max_length=10, choices=TipoCombo.choices, default=TipoCombo.FIXO)
    preco_combo = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    preco_original = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    desconto_percentual = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    imagem = models.ImageField(upload_to='combos/', null=True, blank=True)
    ativo = models.BooleanField(default=True)
    estoque_minimo = models.IntegerField(default=0)
    ordem_exibicao = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem_exibicao', 'nome']
        verbose_name = "Combo"
        verbose_name_plural = "Combos"

    def __str__(self):
        return f"{self.nome} - R$ {self.preco_combo}"

    def calcular_preco_original(self) -> Decimal:
        total = Decimal('0.00')
        for item in self.itens.all():
            total += item.produto.preco_venda * item.quantidade
        return total

    def calcular_desconto_percentual(self) -> Decimal:
        preco_original = self.calcular_preco_original()
        if preco_original > 0:
            desconto = ((preco_original - self.preco_combo) / preco_original) * 100
            return desconto.quantize(Decimal('0.01'))
        return Decimal('0.00')

    def atualizar_calculos(self):
        self.preco_original = self.calcular_preco_original()
        self.desconto_percentual = self.calcular_desconto_percentual()
        self.save(update_fields=['preco_original', 'desconto_percentual', 'updated_at'])

    def verificar_disponibilidade(self) -> tuple[bool, str]:
        if not self.ativo:
            return False, "Combo desativado"
        for item in self.itens.all():
            if not item.produto.ativo:
                return False, f"Produto {item.produto.nome} está inativo"
            if item.produto.estoque < item.quantidade:
                return False, f"Estoque insuficiente de {item.produto.nome}"
        return True, ""


class ItemCombo(TimeStampedModel):
    """Item individual dentro de um combo"""
    combo = models.ForeignKey(ProdutoCombo, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('1.000'), validators=[MinValueValidator(Decimal('0.001'))])
    opcional = models.BooleanField(default=False)
    substituivel = models.BooleanField(default=False)
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem', 'id']
        unique_together = ['combo', 'produto']
        verbose_name = "Item do Combo"
        verbose_name_plural = "Itens do Combo"

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome} ({self.combo.nome})"


class OpcaoSubstituicao(TimeStampedModel):
    """Opções de substituição para itens de combo"""
    item_combo = models.ForeignKey(ItemCombo, on_delete=models.CASCADE, related_name='opcoes_substituicao')
    produto_substituto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    acrescimo_preco = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        unique_together = ['item_combo', 'produto_substituto']
        verbose_name = "Opção de Substituição"
        verbose_name_plural = "Opções de Substituição"

    def __str__(self):
        acrescimo = f" (+R$ {self.acrescimo_preco})" if self.acrescimo_preco > 0 else ""
        return f"{self.produto_substituto.nome}{acrescimo}"


class ProdutoComposto(TimeStampedModel):
    """Produto fabricado a partir de ingredientes"""
    produto_final = models.OneToOneField(Produto, on_delete=models.CASCADE, related_name='composicao')
    descricao_producao = models.TextField(blank=True)
    tempo_preparo = models.IntegerField(default=0, help_text="Minutos")
    custo_adicional = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        verbose_name = "Produto Composto"
        verbose_name_plural = "Produtos Compostos"

    def __str__(self):
        return f"Composição de {self.produto_final.nome}"

    def calcular_custo_total(self) -> Decimal:
        custo = self.custo_adicional
        for ingrediente in self.ingredientes.all():
            custo += ingrediente.produto_ingrediente.preco_custo * ingrediente.quantidade
        return custo

    def verificar_estoque_ingredientes(self) -> tuple[bool, list]:
        faltantes = []
        for ingrediente in self.ingredientes.all():
            if ingrediente.produto_ingrediente.estoque < ingrediente.quantidade:
                faltantes.append({
                    'produto': ingrediente.produto_ingrediente.nome,
                    'necessario': float(ingrediente.quantidade),
                    'disponivel': float(ingrediente.produto_ingrediente.estoque)
                })
        return len(faltantes) == 0, faltantes

    def baixar_estoque_ingredientes(self, quantidade_produzida: Decimal = Decimal('1.0')):
        for ingrediente in self.ingredientes.all():
            quantidade_necessaria = ingrediente.quantidade * quantidade_produzida
            produto = ingrediente.produto_ingrediente
            produto.estoque -= quantidade_necessaria
            produto.save(update_fields=['estoque', 'updated_at'])


class IngredienteComposto(TimeStampedModel):
    """Ingrediente de um produto composto"""
    produto_composto = models.ForeignKey(ProdutoComposto, on_delete=models.CASCADE, related_name='ingredientes')
    produto_ingrediente = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(Decimal('0.001'))])
    unidade = models.CharField(max_length=10, default='un')
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem', 'id']
        unique_together = ['produto_composto', 'produto_ingrediente']
        verbose_name = "Ingrediente"
        verbose_name_plural = "Ingredientes"

    def __str__(self):
        return f"{self.quantidade} {self.unidade} de {self.produto_ingrediente.nome}"


# ========================================
# FAVORITOS E GRIDS
# ========================================

class ProdutoFavorito(TimeStampedModel):
    """Produto marcado como favorito para acesso rápido no PDV"""
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="produtos_favoritos")
    loja = models.ForeignKey(Loja, on_delete=models.CASCADE, related_name="produtos_favoritos")
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="favoritos")
    ordem = models.IntegerField(default=0)
    contador_uso = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem', '-contador_uso', 'produto__nome']
        unique_together = ['usuario', 'loja', 'produto']
        verbose_name = "Produto Favorito"
        verbose_name_plural = "Produtos Favoritos"

    def __str__(self):
        return f"{self.produto.nome} - {self.usuario.username} ({self.loja.nome})"

    def incrementar_uso(self):
        self.contador_uso += 1
        self.save(update_fields=['contador_uso', 'updated_at'])


class GridProdutoPDV(TimeStampedModel):
    """Grid personalizável de produtos no PDV"""
    nome = models.CharField(max_length=100)
    loja = models.ForeignKey(Loja, on_delete=models.CASCADE, related_name="grids_pdv")
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="grids_pdv")
    produtos = models.ManyToManyField(Produto, through='ItemGridPDV', related_name='grids_pdv')
    ordem = models.IntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordem', 'nome']
        verbose_name = "Grid de Produtos PDV"
        verbose_name_plural = "Grids de Produtos PDV"

    def __str__(self):
        return f"{self.nome} ({self.loja.nome})"


class ItemGridPDV(TimeStampedModel):
    """Item dentro de um grid de produtos com posição customizada"""
    grid = models.ForeignKey(GridProdutoPDV, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    posicao_x = models.IntegerField(default=0)
    posicao_y = models.IntegerField(default=0)
    cor_fundo = models.CharField(max_length=7, default='#FFFFFF')
    tamanho = models.CharField(max_length=10, default='normal', choices=[
        ('pequeno', 'Pequeno'), ('normal', 'Normal'), ('grande', 'Grande')
    ])

    class Meta:
        ordering = ['posicao_y', 'posicao_x']
        unique_together = ['grid', 'produto']
        verbose_name = "Item de Grid PDV"
        verbose_name_plural = "Itens de Grid PDV"

    def __str__(self):
        return f"{self.produto.nome} em {self.grid.nome}"


# ========================================
# LISTAS DE PREÇOS E PROMOÇÕES
# ========================================

class ListaPreco(TimeStampedModel):
    """Lista de preços diferenciada"""

    class Tipo(models.TextChoices):
        PADRAO = 'PADRAO', 'Padrão'
        ATACADO = 'ATACADO', 'Atacado'
        VAREJO = 'VAREJO', 'Varejo'
        VIP = 'VIP', 'VIP'
        PROMOCIONAL = 'PROMOCIONAL', 'Promocional'

    loja = models.ForeignKey(Loja, on_delete=models.CASCADE, related_name='listas_preco')
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    tipo = models.CharField(max_length=15, choices=Tipo.choices, default=Tipo.PADRAO)
    ativa = models.BooleanField(default=True)
    quantidade_minima = models.IntegerField(default=0)
    valor_minimo_pedido = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    validade_inicio = models.DateTimeField(null=True, blank=True)
    validade_fim = models.DateTimeField(null=True, blank=True)
    dias_semana = models.CharField(max_length=20, blank=True, help_text="0-6 separados por vírgula")
    horario_inicio = models.TimeField(null=True, blank=True)
    horario_fim = models.TimeField(null=True, blank=True)
    prioridade = models.IntegerField(default=0)

    class Meta:
        ordering = ['-prioridade', 'nome']
        verbose_name = "Lista de Preços"
        verbose_name_plural = "Listas de Preços"

    def __str__(self):
        return f"{self.nome} ({self.loja.nome})"

    def esta_vigente(self) -> bool:
        if not self.ativa:
            return False
        agora = timezone.now()
        if self.validade_inicio and agora < self.validade_inicio:
            return False
        if self.validade_fim and agora > self.validade_fim:
            return False
        if self.dias_semana:
            dias_validos = [int(d) for d in self.dias_semana.split(',')]
            if agora.weekday() not in dias_validos:
                return False
        if self.horario_inicio and self.horario_fim:
            hora_atual = agora.time()
            if not (self.horario_inicio <= hora_atual <= self.horario_fim):
                return False
        return True


class ItemListaPreco(TimeStampedModel):
    """Preço específico de produto em lista"""

    class TipoDesconto(models.TextChoices):
        FIXO = 'FIXO', 'Preço Fixo'
        PERCENTUAL = 'PERCENTUAL', 'Desconto Percentual'
        VALOR = 'VALOR', 'Desconto em Valor'

    lista_preco = models.ForeignKey(ListaPreco, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, null=True, blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, null=True, blank=True)
    tipo_desconto = models.CharField(max_length=11, choices=TipoDesconto.choices, default=TipoDesconto.PERCENTUAL)
    preco_fixo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal('0.01'))])
    desconto_percentual = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(0), MaxValueValidator(100)])
    desconto_valor = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(0)])
    quantidade_minima = models.IntegerField(default=1)

    class Meta:
        unique_together = ['lista_preco', 'produto']
        verbose_name = "Item de Lista de Preços"
        verbose_name_plural = "Itens de Lista de Preços"

    def __str__(self):
        if self.produto:
            return f"{self.produto.nome} - {self.lista_preco.nome}"
        elif self.categoria:
            return f"Categoria {self.categoria.nome} - {self.lista_preco.nome}"
        return f"Item - {self.lista_preco.nome}"

    def calcular_preco_final(self, preco_original: Decimal) -> Decimal:
        if self.tipo_desconto == self.TipoDesconto.FIXO:
            return self.preco_fixo or preco_original
        elif self.tipo_desconto == self.TipoDesconto.PERCENTUAL:
            desconto = preco_original * (self.desconto_percentual / 100)
            return preco_original - desconto
        elif self.tipo_desconto == self.TipoDesconto.VALOR:
            preco_final = preco_original - self.desconto_valor
            return max(preco_final, Decimal('0.01'))
        return preco_original


class Promocao(TimeStampedModel):
    """Promoção automática no PDV"""

    class TipoPromocao(models.TextChoices):
        LEVE_PAGUE = 'LEVE_PAGUE', 'Leve X Pague Y'
        DESCONTO_PROGRESSIVO = 'DESCONTO_PROGRESSIVO', 'Desconto Progressivo'
        COMPRE_GANHE = 'COMPRE_GANHE', 'Compre X Ganhe Y'
        DESCONTO_CATEGORIA = 'DESCONTO_CATEGORIA', 'Desconto em Categoria'
        CASHBACK = 'CASHBACK', 'Cashback em Pontos'

    loja = models.ForeignKey(Loja, on_delete=models.CASCADE, related_name='promocoes')
    nome = models.CharField(max_length=200)
    descricao = models.TextField()
    tipo = models.CharField(max_length=25, choices=TipoPromocao.choices)
    ativa = models.BooleanField(default=True)
    validade_inicio = models.DateTimeField()
    validade_fim = models.DateTimeField()
    produtos = models.ManyToManyField(Produto, blank=True, related_name='promocoes')
    categorias = models.ManyToManyField(Categoria, blank=True, related_name='promocoes')
    quantidade_compra = models.IntegerField(default=0)
    quantidade_paga = models.IntegerField(default=0)
    desconto_percentual = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(0), MaxValueValidator(100)])
    produto_brinde = models.ForeignKey(Produto, on_delete=models.SET_NULL, null=True, blank=True, related_name='promocoes_brinde')
    quantidade_brinde = models.IntegerField(default=1)
    pontos_cashback = models.IntegerField(default=0)
    multiplicador_pontos = models.DecimalField(max_digits=3, decimal_places=1, default=Decimal('1.0'))
    quantidade_maxima_uso = models.IntegerField(default=0, help_text="0=ilimitado")
    quantidade_maxima_cliente = models.IntegerField(default=0, help_text="0=ilimitado")
    valor_minimo_compra = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    prioridade = models.IntegerField(default=0)
    exibir_pdv = models.BooleanField(default=True)

    class Meta:
        ordering = ['-prioridade', '-validade_inicio']
        verbose_name = "Promoção"
        verbose_name_plural = "Promoções"

    def __str__(self):
        return f"{self.nome} ({self.get_tipo_display()})"

    def esta_vigente(self) -> bool:
        if not self.ativa:
            return False
        agora = timezone.now()
        return self.validade_inicio <= agora <= self.validade_fim

    def produto_elegivel(self, produto: Produto) -> bool:
        if self.produtos.exists():
            return self.produtos.filter(id=produto.id).exists()
        if self.categorias.exists():
            return self.categorias.filter(id=produto.categoria_id).exists()
        return False


class UsoPromocao(TimeStampedModel):
    """Registro de uso de promoção"""
    promocao = models.ForeignKey(Promocao, on_delete=models.PROTECT, related_name='usos')
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True)
    venda_id = models.IntegerField()
    valor_desconto = models.DecimalField(max_digits=10, decimal_places=2)
    data_uso = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_uso']
        verbose_name = "Uso de Promoção"
        verbose_name_plural = "Usos de Promoções"

    def __str__(self):
        return f"{self.promocao.nome} - Venda #{self.venda_id}"
