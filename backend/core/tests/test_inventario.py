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


class InventarioNovosFieldsTestCase(TestCase):
    """Testes para novos campos: lote, categoria, marca, conteúdo"""

    def setUp(self):
        from core.models import Categoria, Lote

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

        self.categoria = Categoria.objects.create(
            nome="Bebidas",
            empresa=self.empresa
        )

        self.produto = Produto.objects.create(
            nome="Refrigerante Coca-Cola",
            preco=Decimal("5.50"),
            estoque=Decimal("100"),
            codigo_barras="7891234567890",
            empresa=self.empresa
        )

        self.lote = Lote.objects.create(
            produto=self.produto,
            numero_lote="LOTE001",
            quantidade=Decimal("50"),
            data_validade="2025-12-31",
            preco_custo_lote=Decimal("3.00"),
            empresa=self.empresa
        )

        self.sessao = InventarioSessao.objects.create(
            titulo="Inventário com Novos Campos",
            status="ABERTO",
            empresa=self.empresa
        )

    def test_adicionar_item_com_lote(self):
        """Testa adicionar item ao inventário com lote vinculado"""
        data = {
            "produto": str(self.produto.id),
            "lote": str(self.lote.id),
            "quantidade_contada": "45"
        }

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/adicionar-item/',
            data=data
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['lote'], self.lote.id)
        self.assertEqual(response.data['lote_numero'], self.lote.numero_lote)

    def test_adicionar_item_com_categoria(self):
        """Testa adicionar item com categoria"""
        data = {
            "produto": str(self.produto.id),
            "categoria": str(self.categoria.id),
            "quantidade_contada": "100"
        }

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/adicionar-item/',
            data=data
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['categoria'], self.categoria.id)
        self.assertEqual(response.data['categoria_nome'], self.categoria.nome)

    def test_adicionar_item_com_marca_e_conteudo(self):
        """Testa adicionar item com marca e conteúdo"""
        data = {
            "produto": str(self.produto.id),
            "marca": "Coca-Cola Company",
            "conteudo_valor": "350",
            "conteudo_unidade": "ML",
            "quantidade_contada": "100"
        }

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/adicionar-item/',
            data=data
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['marca'], "Coca-Cola Company")
        self.assertEqual(str(response.data['conteudo_valor']), "350.00")
        self.assertEqual(response.data['conteudo_unidade'], "ML")

    def test_adicionar_item_lote_invalido_retorna_erro(self):
        """Testa que lote inválido retorna erro 400"""
        fake_lote_id = 999999  # ID de lote que não existe

        data = {
            "produto": str(self.produto.id),
            "lote": str(fake_lote_id),
            "quantidade_contada": "50"
        }

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/adicionar-item/',
            data=data
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Lote informado não encontrado", response.data['detail'])

    def test_finalizar_propaga_categoria_para_produto(self):
        """Testa que categoria do item é propagada para produto na finalização"""
        # Produto sem categoria
        produto_sem_categoria = Produto.objects.create(
            nome="Produto Sem Categoria",
            preco=Decimal("10.00"),
            estoque=Decimal("50"),
            empresa=self.empresa
        )

        # Adiciona item com categoria
        InventarioItem.objects.create(
            sessao=self.sessao,
            produto=produto_sem_categoria,
            categoria=self.categoria,
            quantidade_sistema=Decimal("50"),
            quantidade_contada=Decimal("50")
        )

        # Finaliza inventário
        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/finalizar/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifica que categoria foi propagada
        produto_sem_categoria.refresh_from_db()
        self.assertEqual(produto_sem_categoria.categoria_id, self.categoria.id)

    def test_finalizar_propaga_marca_para_produto(self):
        """Testa que marca do item é propagada para produto na finalização"""
        # Produto sem marca
        produto_sem_marca = Produto.objects.create(
            nome="Produto Sem Marca",
            preco=Decimal("10.00"),
            estoque=Decimal("30"),
            empresa=self.empresa
        )

        # Adiciona item com marca
        InventarioItem.objects.create(
            sessao=self.sessao,
            produto=produto_sem_marca,
            marca="Marca Teste",
            quantidade_sistema=Decimal("30"),
            quantidade_contada=Decimal("30")
        )

        # Finaliza
        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/finalizar/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifica propagação
        produto_sem_marca.refresh_from_db()
        self.assertEqual(produto_sem_marca.marca, "Marca Teste")

    def test_finalizar_propaga_conteudo_para_produto(self):
        """Testa que conteúdo_valor e conteudo_unidade são propagados"""
        produto_sem_conteudo = Produto.objects.create(
            nome="Produto Sem Conteúdo",
            preco=Decimal("8.00"),
            estoque=Decimal("20"),
            empresa=self.empresa
        )

        InventarioItem.objects.create(
            sessao=self.sessao,
            produto=produto_sem_conteudo,
            conteudo_valor=Decimal("500"),
            conteudo_unidade="ML",
            quantidade_sistema=Decimal("20"),
            quantidade_contada=Decimal("20")
        )

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/finalizar/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        produto_sem_conteudo.refresh_from_db()
        self.assertEqual(produto_sem_conteudo.conteudo_valor, Decimal("500"))
        self.assertEqual(produto_sem_conteudo.conteudo_unidade, "ML")

    def test_finalizar_atualiza_custo_se_informado(self):
        """Testa que custo informado no inventário atualiza o produto"""
        produto = Produto.objects.create(
            nome="Produto Teste Custo",
            preco=Decimal("10.00"),
            preco_custo=Decimal("5.00"),
            estoque=Decimal("10"),
            empresa=self.empresa
        )

        # Item com custo diferente
        InventarioItem.objects.create(
            sessao=self.sessao,
            produto=produto,
            custo_informado=Decimal("6.50"),
            quantidade_sistema=Decimal("10"),
            quantidade_contada=Decimal("10")
        )

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/finalizar/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        produto.refresh_from_db()
        self.assertEqual(produto.preco_custo, Decimal("6.50"))

    def test_finalizar_nao_sobrescreve_dados_existentes(self):
        """Testa que dados existentes no produto não são sobrescritos"""
        from core.models import Categoria

        produto_completo = Produto.objects.create(
            nome="Produto Completo",
            preco=Decimal("15.00"),
            estoque=Decimal("25"),
            marca="Marca Original",
            conteudo_valor=Decimal("1000"),
            conteudo_unidade="G",
            categoria=self.categoria,
            empresa=self.empresa
        )

        # Item com dados diferentes
        outra_categoria = Categoria.objects.create(
            nome="Outra Categoria",
            empresa=self.empresa
        )

        InventarioItem.objects.create(
            sessao=self.sessao,
            produto=produto_completo,
            marca="Marca Nova",  # Não deve sobrescrever
            categoria=outra_categoria,  # Não deve sobrescrever
            conteudo_valor=Decimal("500"),  # Não deve sobrescrever
            conteudo_unidade="ML",  # Não deve sobrescrever
            quantidade_sistema=Decimal("25"),
            quantidade_contada=Decimal("25")
        )

        response = self.client.post(
            f'/api/estoque/inventarios/{self.sessao.id}/finalizar/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifica que dados originais foram mantidos
        produto_completo.refresh_from_db()
        self.assertEqual(produto_completo.marca, "Marca Original")
        self.assertEqual(produto_completo.categoria_id, self.categoria.id)
        self.assertEqual(produto_completo.conteudo_valor, Decimal("1000"))
        self.assertEqual(produto_completo.conteudo_unidade, "G")
