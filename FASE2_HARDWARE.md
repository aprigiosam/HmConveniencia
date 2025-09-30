# 🖨️ FASE 2 - Hardware e Periféricos

Documentação da implementação de suporte a hardware e periféricos para PDV.

## 📋 Índice

- [Impressora Térmica](#impressora-térmica)
- [Leitor de Código de Barras](#leitor-de-código-de-barras)
- [Balança Digital](#balança-digital-planejado)
- [Como Usar](#como-usar)
- [Troubleshooting](#troubleshooting)

---

## 🖨️ Impressora Térmica

### **Implementado**

Sistema completo de impressão térmica com suporte a protocolo ESC/POS.

### **Funcionalidades**

✅ **Múltiplos Modos de Conexão**:
- **WebUSB**: Conexão direta via navegador (Chrome/Edge)
- **Rede**: Impressora de rede via IP
- **Servidor Local**: Proxy/servidor intermediário

✅ **Comandos ESC/POS Completos**:
- Inicialização
- Alinhamento (esquerda, centro, direita)
- Negrito, sublinhado
- Texto duplo (altura/largura)
- Corte de papel
- Feed de papel
- QR Code
- Código de barras

✅ **Templates de Impressão**:
- Cupom de venda completo
- Cabeçalho customizável
- Listagem de itens
- Totais e descontos
- Formas de pagamento
- Rodapé com data/hora

✅ **Recursos Avançados**:
- Configuração persistente (localStorage)
- Hook React customizado
- Componente de configuração visual
- Teste de impressão
- Tratamento de erros

### **Arquivos Criados**

1. `/frontend/src/utils/printer.ts` - Classe ThermalPrinter
2. `/frontend/src/hooks/usePrinter.ts` - Hook de gerenciamento
3. `/frontend/src/components/PrinterSettings.tsx` - UI de configuração

### **Como Usar**

#### **1. Configurar Impressora**

```tsx
import { PrinterSettings } from './components/PrinterSettings';

function SettingsPage() {
  return <PrinterSettings />;
}
```

#### **2. Usar no Código**

```tsx
import { usePrinter } from './hooks/usePrinter';

function POSPage() {
  const { printReceipt, isPrinting } = usePrinter();

  const handleFinalizeSale = async (sale) => {
    const receipt = {
      header: {
        storeName: 'Minha Loja',
        address: 'Rua Example, 123',
        phone: '(11) 1234-5678',
        cnpj: '12.345.678/0001-90',
      },
      items: sale.items.map(item => ({
        description: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      payments: sale.payments,
      footer: {
        message: 'Obrigado pela preferência!',
        date: new Date(),
        orderNumber: sale.orderNumber,
      },
    };

    const success = await printReceipt(receipt);
    if (success) {
      console.log('Cupom impresso!');
    }
  };

  return (
    <button onClick={handleFinalizeSale} disabled={isPrinting}>
      {isPrinting ? 'Imprimindo...' : 'Finalizar Venda'}
    </button>
  );
}
```

### **Impressoras Suportadas**

| Marca | Modelos | Status |
|-------|---------|--------|
| **Epson** | TM-T20, TM-T88, TM-T81 | ✅ Testado |
| **Bematech** | MP-4200, MP-100, MP-2100 | ✅ Compatível |
| **Elgin** | i7, i9, i10 | ✅ Compatível |
| **Star Micronics** | TSP100, TSP650 | ✅ Compatível |
| **Outras ESC/POS** | Genéricas | ⚠️ Testar |

### **Configuração WebUSB**

Para usar WebUSB (recomendado):

1. **Navegador**: Chrome 61+ ou Edge 79+
2. **HTTPS**: Necessário (exceto localhost)
3. **Permissões**: Usuário deve autorizar acesso USB

#### **Conectar via WebUSB**

```typescript
const { connect, isConnected } = usePrinter();

// Botão para conectar
<button onClick={connect}>
  {isConnected ? 'Conectada' : 'Conectar Impressora'}
</button>
```

### **Configuração Rede**

Para impressora de rede:

1. Configure o IP fixo na impressora
2. Anote a porta (padrão: 9100)
3. Configure no sistema:

```typescript
configurePrinter({
  type: 'network',
  ipAddress: '192.168.1.100',
  port: 9100,
});
```

⚠️ **Importante**: Devido a restrições de CORS, pode ser necessário um proxy/servidor intermediário.

### **Configuração Servidor Local**

Para máxima compatibilidade, use um servidor local:

#### **Opção 1: Node.js Simple Print Server**

```bash
# Instalar
npm install -g simple-print-server

# Executar
simple-print-server --port 9100
```

#### **Opção 2: Python Print Server (Incluído)**

```bash
# Backend já inclui endpoint
cd backend
python manage.py runserver

# Impressora responde em:
# http://localhost:8000/api/v1/hardware/print/
```

Configure no frontend:

```typescript
configurePrinter({
  type: 'local-server',
  serverUrl: 'http://localhost:8000/api/v1/hardware/print/',
});
```

---

## 📟 Leitor de Código de Barras

### **Implementado**

Sistema aprimorado de detecção de leitores de código de barras com diferenciação de digitação manual.

### **Melhorias da FASE 2**

✅ **Detecção Inteligente**:
- Diferencia scanner de digitação manual (velocidade)
- Buffer com timeout configurável
- Prefixo/sufixo configurável

✅ **Configurações Avançadas**:
- Tamanho mínimo/máximo do código
- Ignorar inputs específicos
- Marcação de inputs permitidos (`data-allow-scanner`)
- Limpeza automática de buffer

✅ **Feedback Visual**:
- Console logs para debug
- Aviso de códigos inválidos

### **Como Usar**

#### **Uso Global (Recomendado)**

```tsx
import { useBarcodeScanner } from './hooks/useBarcodeScanner';

function POSPage() {
  const { addProductByCode } = useProductSearch();

  useBarcodeScanner({
    enabled: true,
    minLength: 8,    // EAN-8 mínimo
    maxLength: 14,   // EAN-14 máximo
    timeout: 100,    // 100ms entre caracteres
    onScan: (code) => {
      console.log('Código escaneado:', code);
      addProductByCode(code);
    },
    ignoreInputs: true, // Ignora quando foco está em inputs
  });

  return <div>Seu PDV aqui</div>;
}
```

#### **Input Específico Permitido**

```tsx
<input
  type="text"
  placeholder="Escaneie ou digite o código"
  data-allow-scanner  // Permite scanner mesmo com ignoreInputs=true
  className="..."
/>
```

#### **Configuração Customizada**

```tsx
useBarcodeScanner({
  enabled: true,
  minLength: 4,
  maxLength: 50,
  timeout: 100,     // ms entre caracteres para considerar scan
  prefix: '',       // Prefixo opcional do scanner
  suffix: 'Enter',  // Sufixo (geralmente Enter)
  ignoreInputs: false,
  onScan: (code) => {
    // Processar código
  },
});
```

### **Leitores Suportados**

| Tipo | Compatibilidade |
|------|-----------------|
| **USB HID** (Keyboard Emulation) | ✅ 100% |
| **USB Serial** | ⚠️ Requer driver |
| **Bluetooth** | ✅ Se emular teclado |
| **Wireless** | ✅ Se emular teclado |

### **Troubleshooting Scanner**

#### **Scanner não funciona**

1. **Verificar modo**: Scanner deve estar em modo "Keyboard Emulation" ou "HID"
2. **Testar manualmente**: Digite um código e pressione Enter
3. **Console logs**: Veja se aparecem logs `📟 Código de barras escaneado`
4. **Timeout**: Ajuste o parâmetro `timeout` (50-200ms)

#### **Caracteres faltando**

- Aumente o `timeout` para 150-200ms
- Verifique se scanner está em modo rápido

#### **Códigos duplicados**

- Buffer sendo processado duas vezes
- Verifique se não há múltiplos hooks ativos

---

## ⚖️ Balança Digital (Planejado)

### **Status**: 🚧 Em desenvolvimento

Suporte a balanças digitais via:
- Serial/USB
- Protocolo Toledo
- Protocolo Filizola

**Previsão**: FASE 2 - Parte 2

---

## 🔧 Como Usar

### **Setup Inicial**

1. **Instalar dependências** (já incluídas):
```bash
cd frontend
npm install
```

2. **Configurar impressora**:
   - Acesse Configurações → Hardware → Impressora
   - Escolha o tipo de conexão
   - Teste a impressão

3. **Configurar scanner**:
   - Nenhuma configuração necessária (auto-detecta)
   - Opcional: Ajustar parâmetros no código

### **Integração no PDV**

```tsx
import { usePrinter } from './hooks/usePrinter';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';

function POSPage() {
  const { printReceipt } = usePrinter();
  const { addProduct } = useCart();

  // Scanner automático
  useBarcodeScanner({
    enabled: true,
    onScan: (code) => addProduct(code),
  });

  const handleFinalize = async (sale) => {
    // Imprime cupom
    await printReceipt(sale);
  };

  return <div>{/* Seu PDV */}</div>;
}
```

---

## 🐛 Troubleshooting

### **Impressora WebUSB não conecta**

**Problemas comuns**:
1. ✅ Usar Chrome/Edge (Firefox não suporta)
2. ✅ Usar HTTPS ou localhost
3. ✅ Impressora ligada e conectada via USB
4. ✅ Drivers instalados no sistema

**Solução alternativa**: Use servidor local

### **Impressora imprime caracteres estranhos**

**Causas**:
- Encoding incorreto
- Impressora não suporta ESC/POS

**Solução**:
1. Verificar se impressora é ESC/POS
2. Tentar encoding diferente (UTF-8 vs CP850)

### **Scanner não detecta códigos**

**Verificações**:
1. ✅ Scanner em modo "Keyboard"
2. ✅ Testar digitando manualmente + Enter
3. ✅ Console do navegador (F12) mostrando logs
4. ✅ Ajustar `timeout` e `minLength`

### **Página não carrega depois de adicionar hardware**

**Verificar**:
- Erros no console do navegador
- Imports corretos dos hooks
- TypeScript compilando sem erros

---

## 📊 Comparação com Odoo POS

| Recurso | Odoo POS | Antes | **Agora (FASE 2)** |
|---------|----------|-------|---------------------|
| Impressora ESC/POS | ✅ | ❌ | **✅** |
| WebUSB | ✅ | ❌ | **✅** |
| Rede/Serial | ✅ | ❌ | **✅** |
| Templates Customizáveis | ✅ | ❌ | **✅** |
| Scanner Barcode | ✅ | ⚠️ Básico | **✅ Aprimorado** |
| Balança Digital | ✅ | ❌ | 🚧 Planejado |
| Customer Display | ✅ | ❌ | 🚧 Planejado |

---

## 🎯 Próximos Passos

### **FASE 2 - Parte 2** (Pendente)

- [ ] Fila de impressão
- [ ] Balança digital
- [ ] Customer display secundário
- [ ] Configurações de hardware persistentes
- [ ] Gaveta de dinheiro (cash drawer)

### **FASE 3 - Relatórios**
- [ ] Relatório de fechamento impresso
- [ ] Relatório X (parcial)
- [ ] Relatório Z (fechamento)
- [ ] Sangria/Suprimento detalhado

---

## 📚 Referências

- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
- [Barcode Scanner Integration](https://www.npmjs.com/package/react-barcode-reader)

---

**🎉 Seu sistema agora tem suporte profissional a hardware!**