"""
Models simples para PDV - HMConveniencia
"""
from django.db import models
from decimal import Decimal


class Cliente(models.Model):
    """Cliente - para vendas fiado"""
    nome = models.CharField('Nome', max_length=200)
    telefone = models.CharField('Telefone', max_length=20, blank=True)
    cpf = models.CharField('CPF', max_length=14, blank=True, unique=True, null=True)
    endereco = models.TextField('Endereço', blank=True)
    limite_credito = models.DecimalField('Limite de Crédito', max_digits=10, decimal_places=2, default=0)
    ativo = models.BooleanField('Ativo', default=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'

    def __str__(self):
        return self.nome

    def saldo_devedor(self):
        """Retorna o total de vendas pendentes (fiado)"""
        return self.vendas.filter(status_pagamento='PENDENTE').aggregate(
            total=models.Sum('total')
        )['total'] or Decimal('0.00')

    def pode_comprar_fiado(self, valor):
        """Verifica se cliente pode comprar fiado baseado no limite"""
        if self.limite_credito == 0:
            return True  # Sem limite
        saldo = self.saldo_devedor()
        return (saldo + valor) <= self.limite_credito


class Produto(models.Model):
    """Produto - campos essenciais"""
    nome = models.CharField('Nome', max_length=200)
    preco = models.DecimalField('Preço', max_digits=10, decimal_places=2)
    estoque = models.DecimalField('Estoque', max_digits=10, decimal_places=2, default=0)
    codigo_barras = models.CharField('Código de Barras', max_length=50, blank=True)
    ativo = models.BooleanField('Ativo', default=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Produto'
        verbose_name_plural = 'Produtos'

    def __str__(self):
        return self.nome

    def tem_estoque(self, quantidade):
        """Verifica se tem estoque disponível"""
        return self.estoque >= quantidade


class Venda(models.Model):
    """Venda realizada"""
    STATUS_CHOICES = [
        ('ABERTA', 'Aberta'),
        ('FINALIZADA', 'Finalizada'),
        ('CANCELADA', 'Cancelada'),
    ]

    FORMA_PAGAMENTO_CHOICES = [
        ('DINHEIRO', 'Dinheiro'),
        ('DEBITO', 'Débito'),
        ('CREDITO', 'Crédito'),
        ('PIX', 'PIX'),
        ('FIADO', 'Fiado'),
    ]

    STATUS_PAGAMENTO_CHOICES = [
        ('PAGO', 'Pago'),
        ('PENDENTE', 'Pendente'),
    ]

    numero = models.CharField('Número', max_length=20, unique=True, blank=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, null=True, blank=True, related_name='vendas', verbose_name='Cliente')
    status = models.CharField('Status', max_length=20, choices=STATUS_CHOICES, default='ABERTA')
    forma_pagamento = models.CharField('Forma de Pagamento', max_length=20, choices=FORMA_PAGAMENTO_CHOICES, blank=True)
    status_pagamento = models.CharField('Status Pagamento', max_length=20, choices=STATUS_PAGAMENTO_CHOICES, default='PAGO')
    total = models.DecimalField('Total', max_digits=10, decimal_places=2, default=0)
    desconto = models.DecimalField('Desconto', max_digits=10, decimal_places=2, default=0)
    observacoes = models.TextField('Observações', blank=True)
    data_vencimento = models.DateField('Data Vencimento', null=True, blank=True, help_text='Para vendas fiado')
    created_at = models.DateTimeField('Data', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Venda'
        verbose_name_plural = 'Vendas'

    def __str__(self):
        return f'Venda {self.numero} - R$ {self.total}'

    def save(self, *args, **kwargs):
        # Gera número automático se não existir
        if not self.numero:
            from django.utils import timezone
            hoje = timezone.now()
            self.numero = f'V{hoje.strftime("%Y%m%d%H%M%S")}'
        super().save(*args, **kwargs)

    def calcular_total(self):
        """Calcula o total da venda baseado nos itens"""
        total = sum(item.subtotal for item in self.itens.all())
        self.total = total - self.desconto
        self.save()

    def finalizar(self, forma_pagamento, cliente_id=None, data_vencimento=None):
        """Finaliza a venda e baixa o estoque"""
        if self.status != 'ABERTA':
            raise ValueError('Venda já foi finalizada ou cancelada')

        self.forma_pagamento = forma_pagamento

        # Se for fiado, marca como pendente
        if forma_pagamento == 'FIADO':
            if not cliente_id:
                raise ValueError('Cliente é obrigatório para vendas fiado')
            self.cliente_id = cliente_id
            self.status_pagamento = 'PENDENTE'
            self.data_vencimento = data_vencimento
        else:
            self.status_pagamento = 'PAGO'

        self.status = 'FINALIZADA'
        self.save()

        # Baixa estoque
        for item in self.itens.all():
            item.produto.estoque -= item.quantidade
            item.produto.save()

    def receber_pagamento(self):
        """Marca a venda como paga"""
        if self.status_pagamento == 'PAGO':
            raise ValueError('Venda já está paga')
        self.status_pagamento = 'PAGO'
        self.save()


class ItemVenda(models.Model):
    """Item de uma venda"""
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.DecimalField('Quantidade', max_digits=10, decimal_places=2)
    preco_unitario = models.DecimalField('Preço Unitário', max_digits=10, decimal_places=2)
    subtotal = models.DecimalField('Subtotal', max_digits=10, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Item da Venda'
        verbose_name_plural = 'Itens da Venda'

    def __str__(self):
        return f'{self.quantidade}x {self.produto.nome}'

    def save(self, *args, **kwargs):
        # Calcula subtotal automaticamente
        self.subtotal = self.quantidade * self.preco_unitario
        super().save(*args, **kwargs)


class Caixa(models.Model):
    """Registra a abertura e fechamento do caixa"""
    STATUS_CHOICES = [
        ('ABERTO', 'Aberto'),
        ('FECHADO', 'Fechado'),
    ]

    data_abertura = models.DateTimeField('Data de Abertura', auto_now_add=True)
    data_fechamento = models.DateTimeField('Data de Fechamento', null=True, blank=True)
    valor_inicial = models.DecimalField('Valor Inicial', max_digits=10, decimal_places=2)
    valor_final_sistema = models.DecimalField('Valor Final (Sistema)', max_digits=10, decimal_places=2, null=True, blank=True)
    valor_final_informado = models.DecimalField('Valor Final (Informado)', max_digits=10, decimal_places=2, null=True, blank=True)
    diferenca = models.DecimalField('Diferença', max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField('Status', max_length=10, choices=STATUS_CHOICES, default='ABERTO')
    observacoes = models.TextField('Observações', blank=True)

    class Meta:
        ordering = ['-data_abertura']
        verbose_name = 'Caixa'
        verbose_name_plural = 'Caixas'

    def __str__(self):
        return f'Caixa de {self.data_abertura.strftime("%d/%m/%Y %H:%M")}'


class MovimentacaoCaixa(models.Model):
    """Registra sangrias e suprimentos do caixa"""
    TIPO_CHOICES = [
        ('SANGRIA', 'Sangria'),
        ('SUPRIMENTO', 'Suprimento'),
    ]

    caixa = models.ForeignKey(Caixa, on_delete=models.CASCADE, related_name='movimentacoes')
    tipo = models.CharField('Tipo', max_length=10, choices=TIPO_CHOICES)
    valor = models.DecimalField('Valor', max_digits=10, decimal_places=2)
    descricao = models.CharField('Descrição', max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Movimentação de Caixa'
        verbose_name_plural = 'Movimentações de Caixa'

    def __str__(self):
        return f'{self.get_tipo_display()} - R$ {self.valor}'
