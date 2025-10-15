"""
Admin para HMConveniencia
"""
from django.contrib import admin
from .models import Cliente, Produto, Venda, ItemVenda, Categoria, Caixa, MovimentacaoCaixa


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nome', 'telefone', 'cpf', 'limite_credito', 'saldo_devedor', 'ativo', 'created_at']
    list_filter = ['ativo', 'created_at']
    search_fields = ['nome', 'cpf', 'telefone']
    list_editable = ['ativo']

    def saldo_devedor(self, obj):
        return f'R$ {obj.saldo_devedor():.2f}'
    saldo_devedor.short_description = 'Saldo Devedor'


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'ativo', 'created_at']
    list_filter = ['ativo', 'created_at']
    search_fields = ['nome']
    list_editable = ['ativo']


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'preco', 'preco_custo', 'margem_lucro_display', 'categoria', 'estoque', 'ativo', 'created_at']
    list_filter = ['ativo', 'categoria', 'created_at']
    search_fields = ['nome', 'codigo_barras']
    list_editable = ['preco', 'preco_custo', 'estoque', 'ativo']

    def margem_lucro_display(self, obj):
        return f'{obj.margem_lucro:.2f}%'
    margem_lucro_display.short_description = 'Margem Lucro'


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


class MovimentacaoCaixaInline(admin.TabularInline):
    model = MovimentacaoCaixa
    extra = 0
    readonly_fields = ['created_at']
    fields = ['tipo', 'valor', 'descricao', 'created_at']


@admin.register(Caixa)
class CaixaAdmin(admin.ModelAdmin):
    list_display = ['id', 'data_abertura', 'data_fechamento', 'valor_inicial', 'valor_final_sistema', 'valor_final_informado', 'diferenca', 'status']
    list_filter = ['status', 'data_abertura']
    readonly_fields = ['data_abertura', 'data_fechamento', 'valor_final_sistema', 'diferenca', 'status']
    inlines = [MovimentacaoCaixaInline]

    def has_delete_permission(self, request, obj=None):
        # Não permite deletar caixas fechados
        if obj and obj.status == 'FECHADO':
            return False
        return super().has_delete_permission(request, obj)


@admin.register(MovimentacaoCaixa)
class MovimentacaoCaixaAdmin(admin.ModelAdmin):
    list_display = ['caixa', 'tipo', 'valor', 'descricao', 'created_at']
    list_filter = ['tipo', 'created_at']
    readonly_fields = ['created_at']

    def has_delete_permission(self, request, obj=None):
        # Não permite deletar movimentações de caixas fechados
        if obj and obj.caixa.status == 'FECHADO':
            return False
        return super().has_delete_permission(request, obj)
