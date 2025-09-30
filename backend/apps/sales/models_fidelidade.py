"""
Modelos para programa de fidelidade
Sistema de pontos e recompensas para clientes
"""

from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta

from apps.core.models import TimeStampedModel, Cliente, Loja
from apps.catalog.models import Produto


class ProgramaFidelidade(TimeStampedModel):
    """
    Configuração do programa de fidelidade por loja
    """

    loja = models.OneToOneField(
        Loja,
        on_delete=models.CASCADE,
        related_name='programa_fidelidade'
    )

    nome = models.CharField(
        max_length=100,
        default="Programa de Fidelidade",
        help_text="Nome do programa"
    )

    ativo = models.BooleanField(default=True)

    # Regras de pontuação
    pontos_por_real = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text="Quantos pontos o cliente ganha por cada R$ 1,00 gasto"
    )

    valor_minimo_compra = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Valor mínimo de compra para ganhar pontos"
    )

    # Regras de resgate
    pontos_por_real_desconto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('100.00'),
        help_text="Quantos pontos equivalem a R$ 1,00 de desconto"
    )

    pontos_minimos_resgate = models.IntegerField(
        default=100,
        help_text="Pontos mínimos para começar a resgatar"
    )

    pontos_maximos_resgate_venda = models.IntegerField(
        default=0,
        help_text="Máximo de pontos que pode ser usado em uma venda (0=ilimitado)"
    )

    percentual_maximo_desconto = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentual máximo de desconto usando pontos em uma venda"
    )

    # Expiração de pontos
    pontos_expiram = models.BooleanField(
        default=False,
        help_text="Pontos têm validade?"
    )

    dias_validade_pontos = models.IntegerField(
        default=365,
        help_text="Dias de validade dos pontos"
    )

    # Bônus e multiplicadores
    multiplicador_aniversario = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=Decimal('2.0'),
        help_text="Multiplicador de pontos no mês de aniversário do cliente"
    )

    bonus_cadastro = models.IntegerField(
        default=0,
        help_text="Pontos de bônus ao cadastrar no programa"
    )

    class Meta:
        verbose_name = "Programa de Fidelidade"
        verbose_name_plural = "Programas de Fidelidade"

    def __str__(self):
        return f"{self.nome} - {self.loja.nome}"

    def calcular_pontos(self, valor_compra: Decimal, cliente: Cliente = None) -> int:
        """
        Calcula quantos pontos o cliente ganha em uma compra
        """
        if valor_compra < self.valor_minimo_compra:
            return 0

        pontos = int(valor_compra * self.pontos_por_real)

        # Aplica multiplicador de aniversário
        if cliente and cliente.data_nascimento:
            hoje = timezone.now().date()
            if (cliente.data_nascimento.month == hoje.month and
                cliente.data_nascimento.day == hoje.day):
                pontos = int(pontos * self.multiplicador_aniversario)

        return pontos

    def calcular_valor_desconto(self, pontos: int) -> Decimal:
        """
        Calcula valor de desconto em R$ baseado nos pontos
        """
        if pontos < self.pontos_minimos_resgate:
            return Decimal('0.00')

        return Decimal(pontos) / self.pontos_por_real_desconto


class ClienteFidelidade(TimeStampedModel):
    """
    Dados do cliente no programa de fidelidade
    """

    class Nivel(models.TextChoices):
        BRONZE = 'BRONZE', 'Bronze'
        PRATA = 'PRATA', 'Prata'
        OURO = 'OURO', 'Ouro'
        DIAMANTE = 'DIAMANTE', 'Diamante'

    cliente = models.OneToOneField(
        Cliente,
        on_delete=models.CASCADE,
        related_name='fidelidade'
    )

    programa = models.ForeignKey(
        ProgramaFidelidade,
        on_delete=models.CASCADE,
        related_name='clientes'
    )

    pontos_atual = models.IntegerField(
        default=0,
        help_text="Pontos disponíveis atualmente"
    )

    pontos_total_acumulado = models.IntegerField(
        default=0,
        help_text="Total de pontos ganhos desde sempre"
    )

    pontos_total_usado = models.IntegerField(
        default=0,
        help_text="Total de pontos usados"
    )

    nivel = models.CharField(
        max_length=10,
        choices=Nivel.choices,
        default=Nivel.BRONZE
    )

    data_adesao = models.DateField(auto_now_add=True)

    ativo = models.BooleanField(default=True)

    class Meta:
        unique_together = ['cliente', 'programa']
        verbose_name = "Cliente Fidelidade"
        verbose_name_plural = "Clientes Fidelidade"

    def __str__(self):
        return f"{self.cliente.nome} - {self.pontos_atual} pts"

    def adicionar_pontos(self, pontos: int, motivo: str = ""):
        """Adiciona pontos ao cliente"""
        self.pontos_atual += pontos
        self.pontos_total_acumulado += pontos
        self.save(update_fields=['pontos_atual', 'pontos_total_acumulado', 'updated_at'])

        # Registra movimentação
        MovimentacaoPontos.objects.create(
            cliente_fidelidade=self,
            tipo='CREDITO',
            pontos=pontos,
            saldo_anterior=self.pontos_atual - pontos,
            saldo_novo=self.pontos_atual,
            motivo=motivo
        )

        # Atualiza nível
        self.atualizar_nivel()

    def usar_pontos(self, pontos: int, motivo: str = ""):
        """Usa pontos do cliente"""
        if pontos > self.pontos_atual:
            raise ValueError(f"Cliente não tem pontos suficientes. Disponível: {self.pontos_atual}")

        self.pontos_atual -= pontos
        self.pontos_total_usado += pontos
        self.save(update_fields=['pontos_atual', 'pontos_total_usado', 'updated_at'])

        # Registra movimentação
        MovimentacaoPontos.objects.create(
            cliente_fidelidade=self,
            tipo='DEBITO',
            pontos=pontos,
            saldo_anterior=self.pontos_atual + pontos,
            saldo_novo=self.pontos_atual,
            motivo=motivo
        )

    def atualizar_nivel(self):
        """Atualiza nível do cliente baseado em pontos acumulados"""
        total = self.pontos_total_acumulado

        if total >= 10000:
            novo_nivel = self.Nivel.DIAMANTE
        elif total >= 5000:
            novo_nivel = self.Nivel.OURO
        elif total >= 2000:
            novo_nivel = self.Nivel.PRATA
        else:
            novo_nivel = self.Nivel.BRONZE

        if novo_nivel != self.nivel:
            self.nivel = novo_nivel
            self.save(update_fields=['nivel', 'updated_at'])

    def expirar_pontos(self):
        """Expira pontos antigos"""
        if not self.programa.pontos_expiram:
            return 0

        data_limite = timezone.now().date() - timedelta(days=self.programa.dias_validade_pontos)

        # Busca movimentações antigas de crédito
        movimentacoes_antigas = MovimentacaoPontos.objects.filter(
            cliente_fidelidade=self,
            tipo='CREDITO',
            data__lt=data_limite,
            expirado=False
        )

        pontos_expirados = 0
        for mov in movimentacoes_antigas:
            pontos_expirados += mov.pontos
            mov.expirado = True
            mov.save(update_fields=['expirado'])

        if pontos_expirados > 0:
            self.pontos_atual -= pontos_expirados
            self.save(update_fields=['pontos_atual', 'updated_at'])

            # Registra expiração
            MovimentacaoPontos.objects.create(
                cliente_fidelidade=self,
                tipo='EXPIRACAO',
                pontos=pontos_expirados,
                saldo_anterior=self.pontos_atual + pontos_expirados,
                saldo_novo=self.pontos_atual,
                motivo=f"Expiração de pontos antigos (>{self.programa.dias_validade_pontos} dias)"
            )

        return pontos_expirados


class MovimentacaoPontos(TimeStampedModel):
    """
    Histórico de movimentações de pontos
    """

    class Tipo(models.TextChoices):
        CREDITO = 'CREDITO', 'Crédito'
        DEBITO = 'DEBITO', 'Débito'
        EXPIRACAO = 'EXPIRACAO', 'Expiração'
        AJUSTE = 'AJUSTE', 'Ajuste Manual'

    cliente_fidelidade = models.ForeignKey(
        ClienteFidelidade,
        on_delete=models.CASCADE,
        related_name='movimentacoes'
    )

    tipo = models.CharField(max_length=10, choices=Tipo.choices)

    pontos = models.IntegerField()

    saldo_anterior = models.IntegerField()
    saldo_novo = models.IntegerField()

    motivo = models.TextField(blank=True)

    venda_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID da venda relacionada (se houver)"
    )

    data = models.DateField(auto_now_add=True)

    expirado = models.BooleanField(
        default=False,
        help_text="Indica se estes pontos já expiraram"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Movimentação de Pontos"
        verbose_name_plural = "Movimentações de Pontos"

    def __str__(self):
        operacao = "+" if self.tipo == 'CREDITO' else "-"
        return f"{self.cliente_fidelidade.cliente.nome}: {operacao}{self.pontos} pts"


class Recompensa(TimeStampedModel):
    """
    Recompensas que podem ser resgatadas com pontos
    """

    class Tipo(models.TextChoices):
        DESCONTO = 'DESCONTO', 'Desconto em Compra'
        PRODUTO = 'PRODUTO', 'Produto Grátis'
        BRINDE = 'BRINDE', 'Brinde'

    programa = models.ForeignKey(
        ProgramaFidelidade,
        on_delete=models.CASCADE,
        related_name='recompensas'
    )

    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)

    tipo = models.CharField(max_length=10, choices=Tipo.choices)

    pontos_necessarios = models.IntegerField(
        validators=[MinValueValidator(1)]
    )

    # Para tipo DESCONTO
    valor_desconto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )

    # Para tipo PRODUTO ou BRINDE
    produto = models.ForeignKey(
        Produto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    quantidade = models.IntegerField(default=1)

    imagem = models.ImageField(
        upload_to='recompensas/',
        null=True,
        blank=True
    )

    ativa = models.BooleanField(default=True)

    quantidade_disponivel = models.IntegerField(
        default=0,
        help_text="Quantidade de resgates disponíveis (0=ilimitado)"
    )

    validade_inicio = models.DateField(null=True, blank=True)
    validade_fim = models.DateField(null=True, blank=True)

    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem', 'pontos_necessarios']
        verbose_name = "Recompensa"
        verbose_name_plural = "Recompensas"

    def __str__(self):
        return f"{self.nome} - {self.pontos_necessarios} pts"

    def esta_disponivel(self) -> tuple[bool, str]:
        """Verifica se recompensa está disponível"""
        if not self.ativa:
            return False, "Recompensa desativada"

        hoje = timezone.now().date()

        if self.validade_inicio and hoje < self.validade_inicio:
            return False, "Recompensa ainda não iniciou"

        if self.validade_fim and hoje > self.validade_fim:
            return False, "Recompensa expirada"

        if self.quantidade_disponivel > 0:
            # Conta resgates já feitos
            resgates = ResgatePontos.objects.filter(recompensa=self).count()
            if resgates >= self.quantidade_disponivel:
                return False, "Recompensa esgotada"

        return True, ""


class ResgatePontos(TimeStampedModel):
    """
    Registro de resgate de recompensas
    """

    class Status(models.TextChoices):
        PENDENTE = 'PENDENTE', 'Pendente'
        UTILIZADO = 'UTILIZADO', 'Utilizado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    cliente_fidelidade = models.ForeignKey(
        ClienteFidelidade,
        on_delete=models.PROTECT,
        related_name='resgates'
    )

    recompensa = models.ForeignKey(
        Recompensa,
        on_delete=models.PROTECT
    )

    pontos_gastos = models.IntegerField()

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDENTE
    )

    venda_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID da venda onde foi utilizado"
    )

    data_utilizacao = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Resgate de Pontos"
        verbose_name_plural = "Resgates de Pontos"

    def __str__(self):
        return f"{self.cliente_fidelidade.cliente.nome} - {self.recompensa.nome}"