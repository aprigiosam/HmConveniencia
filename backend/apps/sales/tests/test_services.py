from decimal import Decimal
from itertools import count

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.catalog.models import Categoria, Fornecedor, LoteProduto, Produto
from apps.core.models import Cliente, Loja
from apps.inventory.models import MovimentacaoEstoque
from apps.sales.models import ItemVenda, Venda
from apps.sales.services import finalizar_venda


class FinalizarVendaServiceTests(TestCase):
    def setUp(self) -> None:
        self.loja = Loja.objects.create(cnpj="11.222.333/0001-44", nome="Matriz")
        outra_loja = Loja.objects.create(cnpj="55.666.777/0001-88", nome="Filial")
        self.outra_loja = outra_loja

        categoria = Categoria.objects.create(nome="Mercearia")
        fornecedor = Fornecedor.objects.create(cnpj_cpf="12.345.678/0001-99", nome="Fornecedor")
        self.produto = Produto.objects.create(
            sku="SKU-001",
            codigo_barras="7899990001111",
            nome="Arroz 5kg",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("15.00"),
            preco_venda=Decimal("25.00"),
            estoque_minimo=2,
        )
        self.lote_principal = LoteProduto.objects.create(
            produto=self.produto,
            loja=self.loja,
            numero_lote="LOT-1",
            quantidade=10,
            custo_unitario=Decimal("15.00"),
        )
        self.outra_loja_lote = LoteProduto.objects.create(
            produto=self.produto,
            loja=outra_loja,
            numero_lote="LOT-2",
            quantidade=5,
            custo_unitario=Decimal("15.00"),
        )
        self._sequencia = count(1)

    def _nova_venda(self, quantidade: Decimal, *, lote=None, status=Venda.Status.PENDENTE) -> Venda:
        numero = next(self._sequencia)
        venda = Venda.objects.create(
            loja=self.loja,
            cliente=Cliente.objects.create(cpf=f"000.000.000-{numero:02d}", nome=f"Cliente {numero}"),
            numero_venda=f"VENDA-{numero:03d}",
            status=status,
        )
        ItemVenda.objects.create(
            venda=venda,
            produto=self.produto,
            lote=lote,
            quantidade=Decimal(quantidade),
            preco_unitario=Decimal("25.00"),
        )
        return venda

    def test_finaliza_venda_com_sucesso_e_baixa_estoque(self) -> None:
        venda = self._nova_venda(quantidade=Decimal("2"))

        venda_finalizada = finalizar_venda(venda)

        venda_finalizada.refresh_from_db()
        self.lote_principal.refresh_from_db()

        self.assertEqual(venda_finalizada.status, Venda.Status.FINALIZADA)
        self.assertEqual(venda_finalizada.valor_total, Decimal("50.00"))
        self.assertEqual(self.lote_principal.quantidade, 8)
        movimentacao = MovimentacaoEstoque.objects.get(
            motivo=f"Venda {venda_finalizada.numero_venda}"
        )
        self.assertEqual(movimentacao.quantidade, Decimal("2"))
        self.assertEqual(movimentacao.motivo, f"Venda {venda_finalizada.numero_venda}")

    def test_finalizar_com_quantidade_fracionada_dispara_erro(self) -> None:
        venda = self._nova_venda(quantidade=Decimal("1.5"))

        with self.assertRaisesMessage(ValidationError, "Quantidade fracionada não suportada"):
            finalizar_venda(venda)

    def test_finalizar_com_estoque_insuficiente(self) -> None:
        self.lote_principal.quantidade = 1
        self.lote_principal.save(update_fields=["quantidade"])
        venda = self._nova_venda(quantidade=Decimal("3"))

        with self.assertRaisesMessage(ValidationError, "Estoque insuficiente"):
            finalizar_venda(venda)

    def test_finalizar_com_lote_de_outra_loja_dispara_erro(self) -> None:
        venda = self._nova_venda(quantidade=Decimal("1"), lote=self.outra_loja_lote)

        with self.assertRaisesMessage(ValidationError, "não pertence à loja da venda"):
            finalizar_venda(venda)

    def test_nao_finaliza_venda_cancelada(self) -> None:
        venda = self._nova_venda(quantidade=Decimal("1"), status=Venda.Status.CANCELADA)

        with self.assertRaisesMessage(ValidationError, "Não é possível finalizar uma venda cancelada"):
            finalizar_venda(venda)

    def test_nao_permite_finalizar_venda_sem_persistencia(self) -> None:
        venda = Venda(loja=self.loja, numero_venda="VENDA-TEMP")

        with self.assertRaisesMessage(ValidationError, "Venda inválida para finalização"):
            finalizar_venda(venda)
