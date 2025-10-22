from django.contrib import admin

from .models import Empresa, EstoqueMovimento, NotaFiscal, NotaItem, XMLArmazenado


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("razao_social", "cnpj", "ambiente", "certificado_validade", "updated_at")
    search_fields = ("razao_social", "cnpj")
    list_filter = ("ambiente",)


class NotaItemInline(admin.TabularInline):
    model = NotaItem
    extra = 0
    readonly_fields = ("produto", "descricao", "ncm", "cfop", "quantidade", "valor_unitario", "valor_total")


@admin.register(NotaFiscal)
class NotaFiscalAdmin(admin.ModelAdmin):
    list_display = (
        "chave_acesso",
        "tipo",
        "modelo",
        "serie",
        "numero",
        "status",
        "empresa",
        "valor_total",
        "data_emissao",
    )
    search_fields = ("chave_acesso", "numero", "serie", "cliente__nome", "fornecedor__nome")
    list_filter = ("tipo", "status", "ambiente")
    inlines = [NotaItemInline]


@admin.register(EstoqueMovimento)
class EstoqueMovimentoAdmin(admin.ModelAdmin):
    list_display = ("produto", "origem", "quantidade", "empresa", "nota", "criado_em")
    search_fields = ("produto__nome", "nota__chave_acesso")
    list_filter = ("origem", "empresa")
    autocomplete_fields = ("produto", "nota", "empresa")


@admin.register(XMLArmazenado)
class XMLArmazenadoAdmin(admin.ModelAdmin):
    list_display = ("tipo_documento", "chave_acesso", "ambiente", "importado_em")
    search_fields = ("chave_acesso",)
    list_filter = ("tipo_documento", "ambiente")
