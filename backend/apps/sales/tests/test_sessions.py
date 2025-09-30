from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.core.models import Loja
from apps.sales.models import SessaoPDV
from apps.sales.services import obter_ou_criar_sessao_aberta


class SessaoPDVTests(TestCase):
    def setUp(self) -> None:
        self.loja = Loja.objects.create(cnpj="22.333.444/0001-55", nome="Loja Centro")
        self.usuario = get_user_model().objects.create_user("operador", password="123")

    def test_cria_codigo_sequencial(self) -> None:
        sessao = SessaoPDV.objects.create(loja=self.loja, responsavel=self.usuario)

        self.assertIsNotNone(sessao.codigo)
        self.assertRegex(sessao.codigo, r"^LOJA-\d{6}-POSSESSION$")

    def test_obter_ou_criar_sessao_reaproveita_existente(self) -> None:
        existente = SessaoPDV.objects.create(loja=self.loja, responsavel=self.usuario)

        mesma = obter_ou_criar_sessao_aberta(self.loja, responsavel=self.usuario)

        self.assertEqual(existente.pk, mesma.pk)

    def test_fechar_atualiza_status(self) -> None:
        sessao = SessaoPDV.objects.create(loja=self.loja, responsavel=self.usuario, saldo_inicial=Decimal("100.00"))

        sessao.fechar(saldo_fechamento=Decimal("150.00"))

        sessao.refresh_from_db()
        self.assertEqual(sessao.status, SessaoPDV.Status.FECHADA)
        self.assertEqual(sessao.saldo_fechamento, Decimal("150.00"))
