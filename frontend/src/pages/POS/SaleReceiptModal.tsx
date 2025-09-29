import { useCallback, useMemo, useRef } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";

export type VendaDetalhe = {
  id: number;
  numero_venda: string;
  created_at: string;
  loja?: number;
  loja_nome?: string;
  valor_total: string;
  valor_subtotal: string;
  valor_desconto: string;
  observacoes?: string;
  itens: Array<{
    id: number;
    produto: number;
    produto_nome: string;
    produto_sku: string;
    quantidade: string;
    preco_unitario: string;
    valor_total: string;
  }>;
  pagamentos: Array<{
    id: number;
    forma_pagamento: number;
    forma_pagamento_nome: string;
    valor: string;
  }>;
};

type SaleReceiptModalProps = {
  venda: VendaDetalhe | null;
  onClose: () => void;
};

const formatCurrency = (value: string | number) => {
  const numeric = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(numeric)) {
    return "R$ 0,00";
  }
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDateTime = (value: string) => {
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) {
    return value;
  }
  return `${data.toLocaleDateString("pt-BR")}, ${data.toLocaleTimeString("pt-BR")}`;
};

export const SaleReceiptModal = ({ venda, onClose }: SaleReceiptModalProps) => {
  const totais = useMemo(() => {
    if (!venda) {
      return {
        subtotal: "0",
        desconto: "0",
        total: "0",
      };
    }

    return {
      subtotal: venda.valor_subtotal,
      desconto: venda.valor_desconto,
      total: venda.valor_total,
    };
  }, [venda]);

  const contentRef = useRef<HTMLDivElement | null>(null);

  const handlePrint = useCallback(() => {
    if (!contentRef.current || !venda) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) {
      alert("Permita a abertura de pop-ups para imprimir o cupom.");
      return;
    }

    const styles = `
      body { font-family: Arial, sans-serif; margin: 16px; color: #0f172a; }
      h1, h2, h3 { margin: 0; }
      .header { margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; }
      th:nth-last-child(1), td:nth-last-child(1), th:nth-last-child(2), td:nth-last-child(2) { text-align: right; }
      .totals { margin-top: 12px; font-size: 14px; }
      .totals div { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #0ea5e9; color: #fff; font-size: 11px; }
    `;

    printWindow.document.open();
    printWindow.document.write("<html><head><title>Cupom Fiscal</title>");
    printWindow.document.write(`<style>${styles}</style>`);
    printWindow.document.write("</head><body>");
    printWindow.document.write(`<div class=\"header\"><h2>Cupom fiscal</h2><p>Venda nº ${venda.numero_venda}</p><p>${formatDateTime(venda.created_at)}</p>${venda.loja_nome ? `<p>Loja: ${venda.loja_nome}</p>` : ""}</div>`);
    printWindow.document.write(contentRef.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();

    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  }, [venda]);

  const handleShare = useCallback(async () => {
    if (!venda) {
      return;
    }

    const itensTexto = venda.itens
      .map((item) => `- ${item.quantidade}x ${item.produto_nome} (${formatCurrency(item.valor_total)})`)
      .join("\n");

    const pagamentosTexto = venda.pagamentos
      .map((pagamento) => `${pagamento.forma_pagamento_nome}: ${formatCurrency(pagamento.valor)}`)
      .join("\n");

    const message = `Venda ${venda.numero_venda}\nData: ${formatDateTime(venda.created_at)}${
      venda.loja_nome ? `\nLoja: ${venda.loja_nome}` : ""
    }\n\nItens:\n${itensTexto}\n\nPagamentos:\n${pagamentosTexto}\n\nTotal: ${formatCurrency(venda.valor_total)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Venda ${venda.numero_venda}`,
          text: message,
        });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      alert("Resumo do cupom copiado para a área de transferência.");
      return;
    }

    alert(message);
  }, [venda]);

  if (!venda) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cupom fiscal</h2>
            <p className="text-sm text-slate-500">Venda nº {venda.numero_venda}</p>
            <p className="text-sm text-slate-500">{formatDateTime(venda.created_at)}</p>
            {venda.loja_nome && <p className="text-sm text-slate-500">Loja: {venda.loja_nome}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={handlePrint}>
              Imprimir
            </Button>
            <Button variant="secondary" onClick={handleShare}>
              Compartilhar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>

        <div ref={contentRef}>
          <div className="rounded-lg border border-slate-200">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venda.itens.map((item) => {
                  const quantidade = parseFloat(item.quantidade);
                  const precoUnitario = parseFloat(item.preco_unitario);
                  const totalLinha = parseFloat(item.valor_total);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.produto_nome}</TableCell>
                      <TableCell>{item.produto_sku}</TableCell>
                      <TableCell className="text-right">{quantidade}</TableCell>
                      <TableCell className="text-right">{formatCurrency(precoUnitario)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalLinha)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase text-slate-600">Pagamentos</h3>
              {venda.pagamentos.map((pagamento) => (
                <div key={pagamento.id} className="flex items-center justify-between text-sm">
                  <span>
                    <Badge tone="info">{pagamento.forma_pagamento_nome}</Badge>
                  </span>
                  <span className="font-medium text-slate-800">{formatCurrency(pagamento.valor)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totais.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Descontos</span>
                <span>-{formatCurrency(totais.desconto)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(totais.total)}</span>
              </div>
            </div>
          </div>

          {venda.observacoes && (
            <p className="mt-4 text-xs text-slate-500">Obs.: {venda.observacoes}</p>
          )}
        </div>
      </div>
    </div>
  );
};

