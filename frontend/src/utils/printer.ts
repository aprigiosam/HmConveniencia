/**
 * Utilitário de impressão ESC/POS para impressoras térmicas
 * Suporta WebUSB (Chrome/Edge) e fallback para servidor local
 */

// Comandos ESC/POS
const ESC = '\x1B';
const GS = '\x1D';

export const ESC_POS = {
  // Inicialização
  INIT: `${ESC}@`,

  // Alinhamento
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,

  // Texto
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  UNDERLINE_ON: `${ESC}-\x01`,
  UNDERLINE_OFF: `${ESC}-\x00`,
  DOUBLE_HEIGHT_ON: `${GS}!\x01`,
  DOUBLE_HEIGHT_OFF: `${GS}!\x00`,
  DOUBLE_WIDTH_ON: `${GS}!\x10`,
  DOUBLE_WIDTH_OFF: `${GS}!\x00`,

  // Corte de papel
  CUT: `${GS}V\x00`,

  // Feed de papel
  FEED: '\n',
  FEED_3: '\n\n\n',

  // QR Code
  QR_CODE: (text: string) => {
    const len = text.length;
    return `${GS}(k\x04\x00\x31\x41\x32\x00${GS}(k\x03\x00\x31\x43\x08${GS}(k\x03\x00\x31\x45\x30${GS}(k${String.fromCharCode(len + 3, 0)}\x31\x50\x30${text}${GS}(k\x03\x00\x31\x51\x30`;
  },

  // Código de barras
  BARCODE: (code: string, type: number = 73) => {
    return `${GS}k${String.fromCharCode(type, code.length)}${code}`;
  },
};

export interface PrinterConfig {
  type: 'webusb' | 'network' | 'local-server';
  deviceName?: string;
  ipAddress?: string;
  port?: number;
  serverUrl?: string;
  encoding?: string;
}

export interface Receipt {
  header?: {
    logo?: string;
    storeName: string;
    address?: string;
    phone?: string;
    cnpj?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  footer?: {
    message?: string;
    date: Date;
    orderNumber: string;
  };
}

class ThermalPrinter {
  private device: USBDevice | null = null;
  private config: PrinterConfig;
  private encoder: TextEncoder;

  constructor(config: PrinterConfig) {
    this.config = config;
    this.encoder = new TextEncoder();
  }

  /**
   * Conecta à impressora via WebUSB
   */
  async connectWebUSB(): Promise<boolean> {
    if (!navigator.usb) {
      throw new Error('WebUSB não suportado neste navegador');
    }

    try {
      // Solicita dispositivo USB
      this.device = await navigator.usb.requestDevice({
        filters: [
          // Filtros comuns para impressoras térmicas
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0dd4 }, // Bematech
          { vendorId: 0x0416 }, // Elgin
        ],
      });

      if (!this.device) {
        throw new Error('Nenhuma impressora selecionada');
      }

      await this.device.open();
      await this.device.selectConfiguration(1);
      await this.device.claimInterface(0);

      console.log('✅ Impressora conectada via WebUSB:', this.device.productName);
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar impressora:', error);
      throw error;
    }
  }

  /**
   * Desconecta da impressora
   */
  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.releaseInterface(0);
        await this.device.close();
        this.device = null;
        console.log('✅ Impressora desconectada');
      } catch (error) {
        console.error('❌ Erro ao desconectar:', error);
      }
    }
  }

  /**
   * Envia dados para a impressora via WebUSB
   */
  private async sendToUSB(data: string): Promise<void> {
    if (!this.device) {
      throw new Error('Impressora não conectada');
    }

    const encoded = this.encoder.encode(data);
    await this.device.transferOut(1, encoded);
  }

  /**
   * Envia dados para servidor local de impressão
   */
  private async sendToLocalServer(data: string): Promise<void> {
    const url = this.config.serverUrl || 'http://localhost:9100/print';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar para servidor: ${response.statusText}`);
    }
  }

  /**
   * Envia dados para impressora de rede
   */
  private async sendToNetwork(data: string): Promise<void> {
    const { ipAddress, port } = this.config;
    if (!ipAddress) {
      throw new Error('Endereço IP não configurado');
    }

    // Em ambiente web, precisa de um proxy/servidor intermediário
    const response = await fetch(`http://${ipAddress}:${port || 9100}`, {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      throw new Error('Erro ao enviar para impressora de rede');
    }
  }

  /**
   * Envia comando para impressora
   */
  async send(data: string): Promise<void> {
    try {
      switch (this.config.type) {
        case 'webusb':
          await this.sendToUSB(data);
          break;
        case 'local-server':
          await this.sendToLocalServer(data);
          break;
        case 'network':
          await this.sendToNetwork(data);
          break;
        default:
          throw new Error('Tipo de impressora não suportado');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar para impressora:', error);
      throw error;
    }
  }

  /**
   * Imprime cupom de venda
   */
  async printReceipt(receipt: Receipt): Promise<void> {
    let content = ESC_POS.INIT;

    // Cabeçalho
    if (receipt.header) {
      content += ESC_POS.ALIGN_CENTER;
      content += ESC_POS.DOUBLE_HEIGHT_ON;
      content += ESC_POS.BOLD_ON;
      content += `${receipt.header.storeName}\n`;
      content += ESC_POS.BOLD_OFF;
      content += ESC_POS.DOUBLE_HEIGHT_OFF;

      if (receipt.header.address) {
        content += `${receipt.header.address}\n`;
      }
      if (receipt.header.phone) {
        content += `Tel: ${receipt.header.phone}\n`;
      }
      if (receipt.header.cnpj) {
        content += `CNPJ: ${receipt.header.cnpj}\n`;
      }
      content += ESC_POS.FEED;
    }

    // Linha separadora
    content += ESC_POS.ALIGN_LEFT;
    content += '='.repeat(48) + '\n';

    // Itens
    content += ESC_POS.BOLD_ON;
    content += this.padLine('ITEM', 'QTD', 'UNIT', 'TOTAL');
    content += ESC_POS.BOLD_OFF;
    content += '-'.repeat(48) + '\n';

    receipt.items.forEach((item) => {
      const desc = this.truncate(item.description, 30);
      content += `${desc}\n`;
      content += this.padLine(
        '',
        item.quantity.toFixed(2),
        this.formatCurrency(item.price),
        this.formatCurrency(item.total)
      );
    });

    content += '='.repeat(48) + '\n';

    // Totais
    content += this.padLine('SUBTOTAL', '', '', this.formatCurrency(receipt.subtotal));

    if (receipt.discount && receipt.discount > 0) {
      content += this.padLine('DESCONTO', '', '', `-${this.formatCurrency(receipt.discount)}`);
    }

    content += ESC_POS.BOLD_ON;
    content += ESC_POS.DOUBLE_HEIGHT_ON;
    content += this.padLine('TOTAL', '', '', this.formatCurrency(receipt.total));
    content += ESC_POS.DOUBLE_HEIGHT_OFF;
    content += ESC_POS.BOLD_OFF;
    content += '='.repeat(48) + '\n';

    // Formas de pagamento
    content += ESC_POS.BOLD_ON;
    content += 'PAGAMENTO:\n';
    content += ESC_POS.BOLD_OFF;

    receipt.payments.forEach((payment) => {
      content += this.padLine(
        payment.method,
        '',
        '',
        this.formatCurrency(payment.amount)
      );
    });

    content += '='.repeat(48) + '\n';

    // Rodapé
    if (receipt.footer) {
      content += ESC_POS.ALIGN_CENTER;
      content += ESC_POS.FEED;

      if (receipt.footer.message) {
        content += `${receipt.footer.message}\n`;
      }

      content += `\nPedido: ${receipt.footer.orderNumber}\n`;
      content += `Data: ${receipt.footer.date.toLocaleString('pt-BR')}\n`;

      // QR Code (opcional)
      // content += ESC_POS.QR_CODE(`PEDIDO:${receipt.footer.orderNumber}`);
    }

    content += ESC_POS.FEED_3;
    content += ESC_POS.CUT;

    // Envia para impressora
    await this.send(content);
  }

  /**
   * Teste de impressão
   */
  async printTest(): Promise<void> {
    let content = ESC_POS.INIT;
    content += ESC_POS.ALIGN_CENTER;
    content += ESC_POS.DOUBLE_HEIGHT_ON;
    content += ESC_POS.BOLD_ON;
    content += 'TESTE DE IMPRESSÃO\n';
    content += ESC_POS.BOLD_OFF;
    content += ESC_POS.DOUBLE_HEIGHT_OFF;
    content += ESC_POS.FEED;
    content += '='.repeat(48) + '\n';
    content += ESC_POS.ALIGN_LEFT;
    content += 'Texto normal\n';
    content += ESC_POS.BOLD_ON + 'Texto em negrito\n' + ESC_POS.BOLD_OFF;
    content += ESC_POS.UNDERLINE_ON + 'Texto sublinhado\n' + ESC_POS.UNDERLINE_OFF;
    content += ESC_POS.ALIGN_CENTER;
    content += '='.repeat(48) + '\n';
    content += 'Impressora funcionando corretamente!\n';
    content += ESC_POS.FEED_3;
    content += ESC_POS.CUT;

    await this.send(content);
  }

  // Utilitários privados

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private padLine(col1: string, col2: string, col3: string, col4: string): string {
    const widths = [20, 8, 10, 10];
    const line = [
      col1.padEnd(widths[0]),
      col2.padStart(widths[1]),
      col3.padStart(widths[2]),
      col4.padStart(widths[3]),
    ].join('');
    return line.substring(0, 48) + '\n';
  }
}

// Singleton
let printerInstance: ThermalPrinter | null = null;

export function getPrinter(config?: PrinterConfig): ThermalPrinter {
  if (!printerInstance && config) {
    printerInstance = new ThermalPrinter(config);
  }
  if (!printerInstance) {
    throw new Error('Impressora não configurada. Forneça a configuração primeiro.');
  }
  return printerInstance;
}

export function resetPrinter(): void {
  printerInstance = null;
}

export { ThermalPrinter };