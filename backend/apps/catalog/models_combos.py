"""
Modelos para combos e produtos compostos
Permite criar ofertas de produtos agrupados com preço especial
"""

from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import TimeStampedModel
from .models import Produto


class ProdutoCombo(TimeStampedModel):
    """
    Produto combo - agrupa múltiplos produtos com preço especial
    Ex: Combo Lanche (Hambúrguer + Refrigerante + Batata Frita)
    """

    class TipoCombo(models.TextChoices):
        FIXO = 'FIXO', 'Fixo'  # Produtos específicos fixos
        FLEXIVEL = 'FLEXIVEL', 'Flexível'  # Cliente escolhe dentro de categorias

    nome = models.CharField(
        max_length=200,
        help_text="Nome do combo (ex: Combo Lanche Completo)"
    )

    descricao = models.TextField(
        blank=True,
        help_text="Descrição do combo"
    )

    sku = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código único do combo"
    )

    tipo = models.CharField(
        max_length=10,
        choices=TipoCombo.choices,
        default=TipoCombo.FIXO
    )

    preco_combo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Preço especial do combo"
    )

    preco_original = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Soma dos preços individuais (calculado automaticamente)"
    )

    desconto_percentual = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Percentual de desconto (calculado automaticamente)"
    )

    imagem = models.ImageField(
        upload_to='combos/',
        null=True,
        blank=True
    )

    ativo = models.BooleanField(default=True)

    estoque_minimo = models.IntegerField(
        default=0,
        help_text="Estoque mínimo para vender combo"
    )

    ordem_exibicao = models.IntegerField(
        default=0,
        help_text="Ordem de exibição no PDV"
    )

    class Meta:
        ordering = ['ordem_exibicao', 'nome']
        verbose_name = "Combo"
        verbose_name_plural = "Combos"

    def __str__(self):
        return f"{self.nome} - R$ {self.preco_combo}"

    def calcular_preco_original(self) -> Decimal:
        """Calcula soma dos preços dos itens do combo"""
        total = Decimal('0.00')
        for item in self.itens.all():
            total += item.produto.preco_venda * item.quantidade
        return total

    def calcular_desconto_percentual(self) -> Decimal:
        """Calcula percentual de desconto do combo"""
        preco_original = self.calcular_preco_original()
        if preco_original > 0:
            desconto = ((preco_original - self.preco_combo) / preco_original) * 100
            return desconto.quantize(Decimal('0.01'))
        return Decimal('0.00')

    def atualizar_calculos(self):
        """Atualiza preço original e desconto"""
        self.preco_original = self.calcular_preco_original()
        self.desconto_percentual = self.calcular_desconto_percentual()
        self.save(update_fields=['preco_original', 'desconto_percentual', 'updated_at'])

    def verificar_disponibilidade(self) -> tuple[bool, str]:
        """
        Verifica se combo está disponível para venda
        Returns: (disponivel: bool, motivo: str)
        """
        if not self.ativo:
            return False, "Combo desativado"

        # Verifica estoque de cada item
        for item in self.itens.all():
            if not item.produto.ativo:
                return False, f"Produto {item.produto.nome} está inativo"

            if item.produto.estoque < item.quantidade:
                return False, f"Estoque insuficiente de {item.produto.nome}"

        return True, ""


class ItemCombo(TimeStampedModel):
    """
    Item individual dentro de um combo
    """

    combo = models.ForeignKey(
        ProdutoCombo,
        on_delete=models.CASCADE,
        related_name='itens'
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT,
        help_text="Produto incluído no combo"
    )

    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal('1.000'),
        validators=[MinValueValidator(Decimal('0.001'))],
        help_text="Quantidade do produto no combo"
    )

    opcional = models.BooleanField(
        default=False,
        help_text="Item pode ser removido pelo cliente"
    )

    substituivel = models.BooleanField(
        default=False,
        help_text="Item pode ser substituído por outro"
    )

    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem', 'id']
        unique_together = ['combo', 'produto']
        verbose_name = "Item do Combo"
        verbose_name_plural = "Itens do Combo"

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome} ({self.combo.nome})"


class OpcaoSubstituicao(TimeStampedModel):
    """
    Opções de substituição para itens de combo flexível
    Ex: Refrigerante pode ser substituído por Suco
    """

    item_combo = models.ForeignKey(
        ItemCombo,
        on_delete=models.CASCADE,
        related_name='opcoes_substituicao'
    )

    produto_substituto = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT,
        help_text="Produto que pode substituir o original"
    )

    acrescimo_preco = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Acréscimo no preço do combo ao escolher esta opção"
    )

    class Meta:
        unique_together = ['item_combo', 'produto_substituto']
        verbose_name = "Opção de Substituição"
        verbose_name_plural = "Opções de Substituição"

    def __str__(self):
        acrescimo = f" (+R$ {self.acrescimo_preco})" if self.acrescimo_preco > 0 else ""
        return f"{self.produto_substituto.nome}{acrescimo}"


class ProdutoComposto(TimeStampedModel):
    """
    Produto que é fabricado/montado a partir de outros produtos
    Ex: Sanduíche feito com pão, queijo, presunto, etc
    Usado para controle de estoque de matéria-prima
    """

    produto_final = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name='composicao',
        help_text="Produto final vendido"
    )

    descricao_producao = models.TextField(
        blank=True,
        help_text="Instruções de produção/montagem"
    )

    tempo_preparo = models.IntegerField(
        default=0,
        help_text="Tempo de preparo em minutos"
    )

    custo_adicional = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Custo adicional (mão de obra, embalagem, etc)"
    )

    class Meta:
        verbose_name = "Produto Composto"
        verbose_name_plural = "Produtos Compostos"

    def __str__(self):
        return f"Composição de {self.produto_final.nome}"

    def calcular_custo_total(self) -> Decimal:
        """Calcula custo total do produto composto"""
        custo = self.custo_adicional

        for ingrediente in self.ingredientes.all():
            custo_ingrediente = ingrediente.produto_ingrediente.preco_custo * ingrediente.quantidade
            custo += custo_ingrediente

        return custo

    def verificar_estoque_ingredientes(self) -> tuple[bool, list]:
        """
        Verifica se há estoque suficiente de todos ingredientes
        Returns: (disponivel: bool, ingredientes_faltantes: list)
        """
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
        """Baixa estoque dos ingredientes ao produzir o produto"""
        for ingrediente in self.ingredientes.all():
            quantidade_necessaria = ingrediente.quantidade * quantidade_produzida
            produto = ingrediente.produto_ingrediente
            produto.estoque -= quantidade_necessaria
            produto.save(update_fields=['estoque', 'updated_at'])


class IngredienteComposto(TimeStampedModel):
    """
    Ingrediente (matéria-prima) de um produto composto
    """

    produto_composto = models.ForeignKey(
        ProdutoComposto,
        on_delete=models.CASCADE,
        related_name='ingredientes'
    )

    produto_ingrediente = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT,
        help_text="Produto usado como ingrediente"
    )

    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        help_text="Quantidade do ingrediente necessária"
    )

    unidade = models.CharField(
        max_length=10,
        default='un',
        help_text="Unidade de medida (un, kg, l, etc)"
    )

    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem', 'id']
        unique_together = ['produto_composto', 'produto_ingrediente']
        verbose_name = "Ingrediente"
        verbose_name_plural = "Ingredientes"

    def __str__(self):
        return f"{self.quantidade} {self.unidade} de {self.produto_ingrediente.nome}"