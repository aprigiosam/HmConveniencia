from datetime import date
from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from apps.catalog.models import Categoria, Fornecedor, LoteProduto, Produto
from apps.core.models import Loja
from apps.inventory.models import InventarioEstoque, ItemInventario


class ItemInventarioModelTests(TestCase):
    def setUp(self) -> None:
        self.loja = Loja.objects.create(cnpj="88.999.000/0001-11", nome="Loja Centro")
        categoria = Categoria.objects.create(nome="Higiene")
        fornecedor = Fornecedor.objects.create(cnpj_cpf="77.888.999/0001-00", nome="Fornecedor Higiene")
        self.produto = Produto.objects.create(
            sku="PAPEL01",
            codigo_barras="7891000001111",
            nome="Papel Higiênico",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("3.50"),
            preco_venda=Decimal("5.99"),
        )
        self.lote = LoteProduto.objects.create(
            produto=self.produto,
            loja=self.loja,
            numero_lote="LOTE-001",
            quantidade=15,
            custo_unitario=Decimal("3.50"),
        )
        self.inventario = InventarioEstoque.objects.create(
            loja=self.loja,
            data_inventario=date(2024, 1, 1),
        )

    def test_save_calcula_diferenca_automaticamente(self) -> None:
        item = ItemInventario.objects.create(
            inventario=self.inventario,
            produto=self.produto,
            lote=self.lote,
            quantidade_sistema=Decimal("10"),
            quantidade_contada=Decimal("8"),
        )

        self.assertEqual(item.diferenca, Decimal("-2"))

    def test_nao_permite_duplicar_item_para_mesmo_lote(self) -> None:
        ItemInventario.objects.create(
            inventario=self.inventario,
            produto=self.produto,
            lote=self.lote,
            quantidade_sistema=Decimal("10"),
            quantidade_contada=Decimal("9"),
        )

        with self.assertRaises(IntegrityError):
            ItemInventario.objects.create(
                inventario=self.inventario,
                produto=self.produto,
                lote=self.lote,
                quantidade_sistema=Decimal("5"),
                quantidade_contada=Decimal("6"),
            )
