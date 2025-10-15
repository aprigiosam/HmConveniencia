"""
Admin para HMConveniencia
"""
from django.contrib import admin
from .models import Cliente, Produto, Venda, ItemVenda


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nome', 'telefone', 'cpf', 'limite_credito', 'saldo_devedor', 'ativo', 'created_at']
    list_filter = ['ativo', 'created_at']
    search_fields = ['nome', 'cpf', 'telefone']
    list_editable = ['ativo']

    def saldo_devedor(self, obj):
        return f'R$ {obj.saldo_devedor():.2f}'
    saldo_devedor.short_description = 'Saldo Devedor'


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'preco', 'estoque', 'ativo', 'created_at']
    list_filter = ['ativo', 'created_at']
    search_fields = ['nome', 'codigo_barras']
    list_editable = ['preco', 'estoque', 'ativo']


class ItemVendaInline(admin.TabularInline):
    model = ItemVenda
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Venda)
class VendaAdmin(admin.ModelAdmin):
    list_display = ['numero', 'cliente', 'status', 'forma_pagamento', 'status_pagamento', 'total', 'created_at']
    list_filter = ['status', 'forma_pagamento', 'status_pagamento', 'created_at']
    search_fields = ['numero', 'cliente__nome']
    readonly_fields = ['numero', 'total', 'created_at', 'updated_at']
    inlines = [ItemVendaInline]

    def has_delete_permission(self, request, obj=None):
        # Não permite deletar vendas finalizadas
        if obj and obj.status == 'FINALIZADA':
            return False
        return super().has_delete_permission(request, obj)
