from django.contrib import admin

from .models import EmitenteConfig, EventoNotaFiscal, NotaFiscal, NotaFiscalItem


@admin.register(EmitenteConfig)
class EmitenteConfigAdmin(admin.ModelAdmin):
    list_display = ("loja", "serie", "proximo_numero", "ambiente", "updated_at")
    search_fields = ("loja__nome", "loja__cnpj")


class NotaFiscalItemInline(admin.TabularInline):
    model = NotaFiscalItem
    extra = 0


@admin.register(NotaFiscal)
class NotaFiscalAdmin(admin.ModelAdmin):
    list_display = ("id", "serie", "numero", "status", "config", "created_at")
    search_fields = ("numero", "chave_acesso", "config__loja__nome")
    list_filter = ("status", "ambiente")
    inlines = [NotaFiscalItemInline]


@admin.register(EventoNotaFiscal)
class EventoNotaFiscalAdmin(admin.ModelAdmin):
    list_display = ("nota", "tipo", "created_at")
    list_filter = ("tipo",)
    search_fields = ("nota__numero", "nota__chave_acesso")
