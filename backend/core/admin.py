"""
Admin para HMConveniencia
"""
from django.contrib import admin
from .models import Cliente, Fornecedor, Produto, Venda, ItemVenda, Categoria, Caixa, MovimentacaoCaixa, Alerta, Lote


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nome', 'telefone', 'cpf', 'limite_credito', 'saldo_devedor', 'ativo', 'created_at']
    list_filter = ['ativo', 'created_at']
    search_fields = ['nome', 'cpf', 'telefone']
    list_editable = ['ativo']

    def saldo_devedor(self, obj):
        return f'R$ {obj.saldo_devedor():.2f}'
    saldo_devedor.short_description = 'Saldo Devedor'


@admin.register(Fornecedor)
class FornecedorAdmin(admin.ModelAdmin):
    list_display = ['nome', 'nome_fantasia', 'cnpj', 'telefone', 'total_lotes_display', 'total_compras_display', 'ativo', 'created_at']
    list_filter = ['ativo', 'created_at']
    search_fields = ['nome', 'nome_fantasia', 'cnpj']  # Necessário para autocomplete
    list_editable = ['ativo']

    fieldsets = (
        ('Identificação', {
            'fields': ('nome', 'nome_fantasia', 'cnpj')
        }),
        ('Contato', {
            'fields': ('telefone', 'email', 'endereco')
        }),
        ('Outras Informações', {
            'fields': ('observacoes', 'ativo', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']

    def total_lotes_display(self, obj):
        return obj.total_lotes()
    total_lotes_display.short_description = 'Total Lotes'

    def total_compras_display(self, obj):
        return f'R$ {obj.total_compras():.2f}'
    total_compras_display.short_description = 'Total Compras'


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


@admin.register(Alerta)
class AlertaAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tipo', 'prioridade', 'lido', 'resolvido', 'created_at']
    list_filter = ['tipo', 'prioridade', 'lido', 'resolvido', 'created_at']
    search_fields = ['titulo', 'mensagem']
    list_editable = ['lido', 'resolvido']
    readonly_fields = ['created_at', 'resolvido_em']

    fieldsets = (
        ('Informações do Alerta', {
            'fields': ('tipo', 'prioridade', 'titulo', 'mensagem')
        }),
        ('Relacionamentos', {
            'fields': ('cliente', 'produto', 'venda', 'caixa'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('lido', 'resolvido', 'notificado', 'created_at', 'resolvido_em')
        }),
    )

    actions = ['marcar_como_lido', 'marcar_como_resolvido']

    def marcar_como_lido(self, request, queryset):
        count = queryset.update(lido=True)
        self.message_user(request, f'{count} alerta(s) marcado(s) como lido(s).')
    marcar_como_lido.short_description = 'Marcar como lido'

    def marcar_como_resolvido(self, request, queryset):
        from django.utils import timezone
        count = queryset.update(resolvido=True, resolvido_em=timezone.now())
        self.message_user(request, f'{count} alerta(s) marcado(s) como resolvido(s).')
    marcar_como_resolvido.short_description = 'Marcar como resolvido'


@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'produto', 'numero_lote', 'quantidade', 'data_validade', 'dias_para_vencer_display', 'fornecedor', 'ativo', 'data_entrada']
    list_filter = ['ativo', 'data_validade', 'data_entrada', 'produto', 'fornecedor']
    search_fields = ['numero_lote', 'produto__nome', 'fornecedor__nome', 'fornecedor__nome_fantasia']
    list_editable = ['ativo']
    readonly_fields = ['created_at', 'updated_at', 'esta_vencido', 'dias_para_vencer', 'proximo_vencimento']
    autocomplete_fields = ['fornecedor']

    fieldsets = (
        ('Informações do Lote', {
            'fields': ('produto', 'numero_lote', 'quantidade', 'ativo')
        }),
        ('Validade', {
            'fields': ('data_validade', 'esta_vencido', 'dias_para_vencer', 'proximo_vencimento')
        }),
        ('Fornecedor e Custo', {
            'fields': ('fornecedor', 'preco_custo_lote', 'observacoes'),
            'classes': ('collapse',)
        }),
        ('Datas', {
            'fields': ('data_entrada', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def dias_para_vencer_display(self, obj):
        """Exibe dias para vencer com cores"""
        dias = obj.dias_para_vencer
        if dias is None:
            return '-'
        if dias < 0:
            return f'Vencido há {abs(dias)} dias'
        if dias == 0:
            return 'Vence hoje'
        if dias <= 7:
            return f'{dias} dias (⚠️)'
        return f'{dias} dias'
    dias_para_vencer_display.short_description = 'Dias p/ Vencer'

    actions = ['desativar_lotes', 'ativar_lotes']

    def desativar_lotes(self, request, queryset):
        count = queryset.update(ativo=False)
        self.message_user(request, f'{count} lote(s) desativado(s).')
    desativar_lotes.short_description = 'Desativar lotes selecionados'

    def ativar_lotes(self, request, queryset):
        count = queryset.update(ativo=True)
        self.message_user(request, f'{count} lote(s) ativado(s).')
    ativar_lotes.short_description = 'Ativar lotes selecionados'
