from django.test import TestCase

from apps.core.models import Loja, SequenciaDocumento


class SequenciaDocumentoTests(TestCase):
    def setUp(self) -> None:
        self.loja = Loja.objects.create(
            cnpj="11.222.333/0001-44",
            nome="Matriz Centro",
        )

    def test_gera_numero_incremental_por_loja(self) -> None:
        primeiro = SequenciaDocumento.gerar_numero(loja=self.loja, codigo="POS")
        segundo = SequenciaDocumento.gerar_numero(loja=self.loja, codigo="POS")

        self.assertNotEqual(primeiro, segundo)
        self.assertTrue(primeiro.endswith("-POS"))
        self.assertTrue(segundo.endswith("-POS"))
        self.assertRegex(primeiro, r"^MATR-\d{6}-POS$")

    def test_sequencias_diferentes_para_codigos_distintos(self) -> None:
        numero_venda = SequenciaDocumento.gerar_numero(loja=self.loja, codigo="POS")
        numero_fat = SequenciaDocumento.gerar_numero(loja=self.loja, codigo="INV")

        self.assertNotEqual(numero_venda, numero_fat)
        self.assertTrue(numero_fat.endswith("-INV"))

