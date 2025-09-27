from decimal import Decimal

from django.test import TestCase

from apps.core.models import Loja
from apps.catalog.models import Categoria, Fornecedor, Produto
from apps.sales.models import ItemVenda, Venda

from apps.nfe.models import EmitenteConfig
from apps.nfe.services import criar_nfe_para_venda, simular_autorizacao


class NfeServiceTests(TestCase):
    def setUp(self):
        self.loja = Loja.objects.create(
            cnpj="12.345.678/0001-99",
            nome="Loja Central",
        )
        self.config = EmitenteConfig.objects.create(
            loja=self.loja,
            serie=1,
            proximo_numero=1,
            ambiente=EmitenteConfig.Ambiente.HOMOLOGACAO,
        )
        categoria = Categoria.objects.create(nome="Bebidas")
        fornecedor = Fornecedor.objects.create(
            cnpj_cpf="11.222.333/0001-44",
            nome="Distribuidora SP",
        )
        self.produto = Produto.objects.create(
            sku="COCA001",
            codigo_barras="7891000100101",
            nome="Coca-Cola 350ml",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("3.00"),
            preco_venda=Decimal("5.00"),
        )
        self.venda = Venda.objects.create(
            loja=self.loja,
            numero_venda="TEST-001",
            status=Venda.Status.FINALIZADA,
        )
        ItemVenda.objects.create(
            venda=self.venda,
            produto=self.produto,
            quantidade=Decimal("2"),
            preco_unitario=Decimal("5.00"),
            valor_total=Decimal("10.00"),
        )

    def test_criar_nfe_para_venda_incrementa_numero(self):
        nota = criar_nfe_para_venda(self.venda, self.config)
        self.config.refresh_from_db()
        self.assertEqual(nota.numero, 1)
        self.assertEqual(self.config.proximo_numero, 2)
        self.assertEqual(nota.itens.count(), 1)
        self.assertEqual(nota.total_produtos, Decimal("10.00"))
        self.assertTrue(nota.chave_acesso)

    def test_simular_autorizacao_atualiza_status(self):
        nota = criar_nfe_para_venda(self.venda, self.config)
        nota = simular_autorizacao(nota)
        self.assertEqual(nota.status, nota.Status.AUTORIZADA)
        self.assertTrue(nota.protocolo_autorizacao)
        self.assertIsNotNone(nota.dh_autorizacao)
