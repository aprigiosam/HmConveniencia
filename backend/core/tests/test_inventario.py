"""
Testes para funcionalidades de inventário
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Produto, InventarioSessao, InventarioItem
from fiscal.models import Empresa


class InventarioSessaoDeleteTestCase(TestCase):
    """Testa exclusão de sessões de inventário"""

    def setUp(self):
        self.empresa = Empresa.objects.create(
            razao_social="Empresa Teste Ltda",
            nome_fantasia="Empresa Teste",
            cnpj="12345678901234"
        )
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.produto1 = Produto.objects.create(
            nome="Produto 1",
            preco=Decimal("10.00"),
            estoque=Decimal("100"),
            empresa=self.empresa
        )
        self.produto2 = Produto.objects.create(
            nome="Produto 2",
            preco=Decimal("20.00"),
            estoque=Decimal("50"),
            empresa=self.empresa
        )

    def test_delete_sessao_aberta_sucesso(self):
        """Deve permitir excluir sessão com status ABERTO"""
        sessao = InventarioSessao.objects.create(
            titulo="Inventário Teste",
            status="ABERTO",
            empresa=self.empresa
        )

        # Adiciona alguns itens
        InventarioItem.objects.create(
            sessao=sessao,
            produto=self.produto1,
            quantidade_sistema=Decimal("100"),
            quantidade_contada=Decimal("95")
        )
        InventarioItem.objects.create(
            sessao=sessao,
            produto=self.produto2,
            quantidade_sistema=Decimal("50"),
            quantidade_contada=Decimal("50")
        )

        # Verifica que existem 2 itens
        self.assertEqual(sessao.itens.count(), 2)

        # Exclui a sessão
        response = self.client.delete(f'/api/estoque/inventarios/{sessao.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verifica que a sessão foi excluída
        self.assertFalse(InventarioSessao.objects.filter(id=sessao.id).exists())

        # Verifica que os itens também foram excluídos (CASCADE)
        self.assertEqual(InventarioItem.objects.filter(sessao=sessao).count(), 0)

    def test_delete_sessao_em_andamento_sucesso(self):
        """Deve permitir excluir sessão com status EM_ANDAMENTO"""
        sessao = InventarioSessao.objects.create(
            titulo="Inventário Em Andamento",
            status="EM_ANDAMENTO",
            empresa=self.empresa
        )

        response = self.client.delete(f'/api/estoque/inventarios/{sessao.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InventarioSessao.objects.filter(id=sessao.id).exists())

    def test_delete_sessao_finalizada_com_reversao_estoque(self):
        """Deve permitir excluir sessão finalizada e reverter ajustes de estoque"""
        from django.utils import timezone

        # Guarda estoque inicial dos produtos
        estoque_inicial_p1 = self.produto1.estoque
        estoque_inicial_p2 = self.produto2.estoque

        sessao = InventarioSessao.objects.create(
            titulo="Inventário Finalizado",
            status="FINALIZADO",
            finalizado_em=timezone.now(),
            empresa=self.empresa
        )

        # Cria itens com diferenças
        InventarioItem.objects.create(
            sessao=sessao,
            produto=self.produto1,
            quantidade_sistema=Decimal("100"),
            quantidade_contada=Decimal("95")  # Diferença: -5
        )
        InventarioItem.objects.create(
            sessao=sessao,
            produto=self.produto2,
            quantidade_sistema=Decimal("50"),
            quantidade_contada=Decimal("55")  # Diferença: +5
        )

        # Simula que o inventário foi finalizado e ajustou os estoques
        self.produto1.estoque = Decimal("95")  # Ajustado para quantidade contada
        self.produto1.save()
        self.produto2.estoque = Decimal("55")  # Ajustado para quantidade contada
        self.produto2.save()

        # Agora exclui a sessão finalizada
        response = self.client.delete(f'/api/estoque/inventarios/{sessao.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verifica que a sessão foi excluída
        self.assertFalse(InventarioSessao.objects.filter(id=sessao.id).exists())

        # Verifica que os estoques foram revertidos
        self.produto1.refresh_from_db()
        self.produto2.refresh_from_db()

        # Produto 1: estava em 95, diferença era -5, então reverte +5 = 100
        self.assertEqual(self.produto1.estoque, estoque_inicial_p1)

        # Produto 2: estava em 55, diferença era +5, então reverte -5 = 50
        self.assertEqual(self.produto2.estoque, estoque_inicial_p2)

    def test_delete_sessao_finalizada_deleta_movimentos_estoque(self):
        """Verifica que movimentos de estoque relacionados são deletados"""
        from django.utils import timezone
        from fiscal.models import EstoqueMovimento, EstoqueOrigem

        sessao = InventarioSessao.objects.create(
            titulo="Inventário com Movimentos",
            status="FINALIZADO",
            finalizado_em=timezone.now(),
            empresa=self.empresa
        )

        # Cria item com diferença
        InventarioItem.objects.create(
            sessao=sessao,
            produto=self.produto1,
            quantidade_sistema=Decimal("100"),
            quantidade_contada=Decimal("90")
        )

        # Simula criação de movimento de estoque durante finalização
        EstoqueMovimento.objects.create(
            empresa=self.empresa,
            produto=self.produto1,
            quantidade=Decimal("-10"),
            origem=EstoqueOrigem.AJUSTE,
            observacao=f"Ajuste inventário {sessao.titulo} - Item contado: 90, Sistema: 100"
        )

        # Verifica que movimento existe
        movimentos_antes = EstoqueMovimento.objects.filter(
            observacao__contains=f"Ajuste inventário {sessao.titulo}"
        ).count()
        self.assertEqual(movimentos_antes, 1)

        # Exclui a sessão
        response = self.client.delete(f'/api/estoque/inventarios/{sessao.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verifica que movimentos foram deletados
        movimentos_depois = EstoqueMovimento.objects.filter(
            observacao__contains=f"Ajuste inventário {sessao.titulo}"
        ).count()
        self.assertEqual(movimentos_depois, 0)

    def test_delete_sessao_inexistente_404(self):
        """Deve retornar 404 ao tentar excluir sessão inexistente"""
        import uuid
        fake_id = uuid.uuid4()

        response = self.client.delete(f'/api/estoque/inventarios/{fake_id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_sessao_cascade_itens(self):
        """Verifica que ao excluir sessão, todos os itens são excluídos (CASCADE)"""
        sessao = InventarioSessao.objects.create(
            titulo="Inventário com Muitos Itens",
            status="ABERTO",
            empresa=self.empresa
        )

        # Cria 10 itens
        for i in range(10):
            InventarioItem.objects.create(
                sessao=sessao,
                produto=self.produto1 if i % 2 == 0 else self.produto2,
                quantidade_sistema=Decimal("10"),
                quantidade_contada=Decimal("10"),
                descricao=f"Item {i+1}"
            )

        # Verifica que existem 10 itens
        self.assertEqual(sessao.itens.count(), 10)
        total_itens_antes = InventarioItem.objects.count()

        # Exclui a sessão
        response = self.client.delete(f'/api/estoque/inventarios/{sessao.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verifica que os 10 itens foram excluídos
        total_itens_depois = InventarioItem.objects.count()
        self.assertEqual(total_itens_antes - total_itens_depois, 10)


class InventarioItemTestCase(TestCase):
    """Testes para itens de inventário"""

    def setUp(self):
        self.empresa = Empresa.objects.create(
            razao_social="Empresa Teste Ltda",
            nome_fantasia="Empresa Teste",
            cnpj="12345678901234"
        )
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.produto = Produto.objects.create(
            nome="Produto Teste",
            preco=Decimal("10.00"),
            estoque=Decimal("100"),
            codigo_barras="7891234567890",
            empresa=self.empresa
        )

        self.sessao = InventarioSessao.objects.create(
            titulo="Inventário Teste",
            status="ABERTO",
            empresa=self.empresa
        )

    def test_adicionar_item_com_produto(self):
        """Testa adicionar item ao inventário com produto vinculado"""
        data = {
            "produto": str(self.produto.id),
            "quantidade_contada": "95"
        }

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/adicionar-item/',
            data=data
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['produto'], self.produto.id)
        self.assertEqual(Decimal(response.data['quantidade_sistema']), Decimal("100"))
        self.assertEqual(Decimal(response.data['quantidade_contada']), Decimal("95"))
        self.assertEqual(Decimal(response.data['diferenca']), Decimal("-5"))

    def test_adicionar_item_preenche_dados_automaticamente(self):
        """Verifica que dados do produto são preenchidos automaticamente"""
        data = {
            "produto": str(self.produto.id),
            "quantidade_contada": "100"
        }

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/adicionar-item/',
            data=data
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Verifica que codigo_barras foi preenchido do produto
        self.assertEqual(response.data['codigo_barras'], self.produto.codigo_barras)
        # Verifica que descricao foi preenchida com o nome do produto
        self.assertEqual(response.data['descricao'], self.produto.nome)
        # Verifica que quantidade_sistema foi preenchida com estoque atual
        self.assertEqual(Decimal(response.data['quantidade_sistema']), self.produto.estoque)

    def test_calculo_diferenca(self):
        """Testa cálculo da diferença entre sistema e contagem"""
        item = InventarioItem.objects.create(
            sessao=self.sessao,
            produto=self.produto,
            quantidade_sistema=Decimal("100"),
            quantidade_contada=Decimal("105")
        )

        # Diferença = contada - sistema = 105 - 100 = +5
        self.assertEqual(item.diferenca, Decimal("5"))

        # Testa diferença negativa
        item.quantidade_contada = Decimal("90")
        item.save()
        item.refresh_from_db()

        # Diferença = 90 - 100 = -10
        self.assertEqual(item.diferenca, Decimal("-10"))

    def test_finalizar_inventario_cria_produto_para_item_sem_cadastro(self):
        """Itens sem produto devem gerar produto automático ao finalizar."""
        item = InventarioItem.objects.create(
            sessao=self.sessao,
            descricao="Produto Novo Inventário",
            codigo_barras="1231231231231",
            quantidade_sistema=Decimal("0"),
            quantidade_contada=Decimal("8"),
            custo_informado=Decimal("4.50"),
        )

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/finalizar/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        item.refresh_from_db()
        self.assertIsNotNone(item.produto)
        self.assertEqual(item.produto.nome, "Produto Novo Inventário")
        self.assertEqual(item.produto.codigo_barras, "1231231231231")
        self.assertEqual(item.produto.estoque, Decimal("8"))

        from fiscal.models import EstoqueMovimento, EstoqueOrigem

        movimento = EstoqueMovimento.objects.filter(
            produto=item.produto,
            origem=EstoqueOrigem.AJUSTE,
        ).first()

        self.assertIsNotNone(movimento)
        self.assertEqual(movimento.quantidade, Decimal("8"))

        self.sessao.refresh_from_db()
        self.assertEqual(self.sessao.status, "FINALIZADO")

    def test_finalizar_inventario_associa_produto_existente_por_codigo(self):
        """Itens sem vínculo, mas com código conhecido, usam produto existente."""
        item = InventarioItem.objects.create(
            sessao=self.sessao,
            codigo_barras=self.produto.codigo_barras,
            descricao="Outro nome qualquer",
            quantidade_sistema=Decimal("100"),
            quantidade_contada=Decimal("120"),
        )

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/finalizar/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        item.refresh_from_db()
        self.assertEqual(item.produto_id, self.produto.id)

        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque, Decimal("120"))
