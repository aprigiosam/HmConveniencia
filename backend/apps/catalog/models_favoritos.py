"""
Modelos para produtos favoritos do PDV
Permite que usuários marquem produtos frequentemente vendidos
"""

from django.contrib.auth import get_user_model
from django.db import models

from apps.core.models import TimeStampedModel, Loja
from .models import Produto

User = get_user_model()


class ProdutoFavorito(TimeStampedModel):
    """
    Produto marcado como favorito por um usuário/loja
    Permite acesso rápido no PDV
    """

    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="produtos_favoritos",
        help_text="Usuário que marcou como favorito"
    )

    loja = models.ForeignKey(
        Loja,
        on_delete=models.CASCADE,
        related_name="produtos_favoritos",
        help_text="Loja onde o produto é favorito"
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="favoritos",
        help_text="Produto marcado como favorito"
    )

    ordem = models.IntegerField(
        default=0,
        help_text="Ordem de exibição (produtos mais usados primeiro)"
    )

    contador_uso = models.IntegerField(
        default=0,
        help_text="Quantas vezes o produto foi vendido via favoritos"
    )

    class Meta:
        ordering = ['ordem', '-contador_uso', 'produto__nome']
        unique_together = ['usuario', 'loja', 'produto']
        verbose_name = "Produto Favorito"
        verbose_name_plural = "Produtos Favoritos"

    def __str__(self):
        return f"{self.produto.nome} - {self.usuario.username} ({self.loja.nome})"

    def incrementar_uso(self):
        """Incrementa contador quando produto é usado"""
        self.contador_uso += 1
        self.save(update_fields=['contador_uso', 'updated_at'])


class GridProdutoPDV(TimeStampedModel):
    """
    Configuração de grid personalizável de produtos no PDV
    Permite organizar produtos em categorias/grades customizadas
    """

    nome = models.CharField(
        max_length=100,
        help_text="Nome do grid (ex: Bebidas, Lanches Rápidos)"
    )

    loja = models.ForeignKey(
        Loja,
        on_delete=models.CASCADE,
        related_name="grids_pdv"
    )

    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="grids_pdv",
        help_text="Usuário dono do grid (null = compartilhado)"
    )

    produtos = models.ManyToManyField(
        Produto,
        through='ItemGridPDV',
        related_name='grids_pdv'
    )

    ordem = models.IntegerField(default=0)

    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordem', 'nome']
        verbose_name = "Grid de Produtos PDV"
        verbose_name_plural = "Grids de Produtos PDV"

    def __str__(self):
        return f"{self.nome} ({self.loja.nome})"


class ItemGridPDV(TimeStampedModel):
    """
    Item individual dentro de um grid de produtos
    Contém posição e configurações específicas
    """

    grid = models.ForeignKey(
        GridProdutoPDV,
        on_delete=models.CASCADE,
        related_name='itens'
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE
    )

    posicao_x = models.IntegerField(
        default=0,
        help_text="Posição horizontal (coluna)"
    )

    posicao_y = models.IntegerField(
        default=0,
        help_text="Posição vertical (linha)"
    )

    cor_fundo = models.CharField(
        max_length=7,
        default='#FFFFFF',
        help_text="Cor de fundo do botão (hex)"
    )

    tamanho = models.CharField(
        max_length=10,
        default='normal',
        choices=[
            ('pequeno', 'Pequeno'),
            ('normal', 'Normal'),
            ('grande', 'Grande'),
        ]
    )

    class Meta:
        ordering = ['posicao_y', 'posicao_x']
        unique_together = ['grid', 'produto']
        verbose_name = "Item de Grid PDV"
        verbose_name_plural = "Itens de Grid PDV"

    def __str__(self):
        return f"{self.produto.nome} em {self.grid.nome}"