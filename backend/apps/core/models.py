from django.db import models, transaction
from django.db.models import F

from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Loja(TimeStampedModel):
    cnpj = models.CharField(max_length=18, unique=True)
    nome = models.CharField(max_length=255)
    endereco = models.JSONField(default=dict, blank=True)
    telefone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class Cliente(TimeStampedModel):
    cpf = models.CharField(max_length=14, unique=True)
    nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    endereco = models.JSONField(default=dict, blank=True)
    pontos_fidelidade = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class FormaPagamento(TimeStampedModel):
    class Tipo(models.TextChoices):
        DINHEIRO = "DINHEIRO", "Dinheiro"
        DEBITO = "DEBITO", "Cartao de Debito"
        CREDITO = "CREDITO", "Cartao de Credito"
        PIX = "PIX", "Pix"
        TRANSFERENCIA = "TRANSFERENCIA", "Transferencia"

    nome = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    taxa = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    prazo_recebimento = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class SequenciaDocumento(TimeStampedModel):
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("loja", "codigo"),
                name="uniq_sequencia_documento_loja_codigo",
            )
        ]
        ordering = ("codigo", "loja__nome")

    loja = models.ForeignKey(
        "Loja",
        on_delete=models.CASCADE,
        related_name="sequencias",
    )
    codigo = models.CharField(max_length=32)
    descricao = models.CharField(max_length=128, blank=True)
    prefixo = models.CharField(max_length=16, blank=True)
    sufixo = models.CharField(max_length=16, blank=True)
    padding = models.PositiveSmallIntegerField(default=5)
    proximo_numero = models.PositiveIntegerField(default=1)
    incremento = models.PositiveSmallIntegerField(default=1)

    def __str__(self) -> str:  # pragma: no cover - representação simples
        return f"{self.codigo} ({self.loja.nome})"

    def _formatar(self, numero: int) -> str:
        corpo = str(numero).zfill(self.padding)
        return f"{self.prefixo}{corpo}{self.sufixo}"

    @classmethod
    def _defaults_para(cls, loja: "Loja", codigo: str) -> dict[str, str | int]:
        slug = slugify(loja.nome or "loja") or loja.cnpj.replace("/", "")
        base = slug.upper().replace("-", "")[:4]
        prefixo = f"{base}-" if base else ""
        sufixo = f"-{codigo.upper()}"
        descricao = f"Sequência {codigo} - {loja.nome}"
        return {
            "descricao": descricao,
            "prefixo": prefixo,
            "sufixo": sufixo,
        }

    @classmethod
    def gerar_numero(cls, *, loja: "Loja", codigo: str) -> str:
        """Retorna o próximo número formatado e incrementa a sequência.

        A lógica espelha o comportamento do ``ir.sequence`` do Odoo, garantindo
        números por loja/código e evitando condições de corrida com ``select_for_update``.
        """

        if not loja_id := getattr(loja, "pk", None):  # pragma: no cover - guard clause direta
            raise ValueError("Loja precisa estar persistida para gerar sequência")

        with transaction.atomic():
            defaults = cls._defaults_para(loja, codigo)
            sequencia, _ = cls.objects.select_for_update().get_or_create(
                loja_id=loja_id,
                codigo=codigo,
                defaults={
                    **defaults,
                    "padding": 6,
                },
            )

            numero_atual = sequencia.proximo_numero
            sequencia.proximo_numero = F("proximo_numero") + sequencia.incremento
            sequencia.save(update_fields=["proximo_numero", "updated_at"])
            sequencia.refresh_from_db(fields=["proximo_numero"])

        return sequencia._formatar(numero_atual)
