import { Card } from "./ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import type { ReportJob } from "../services/reports";

interface MetricValue {
  valor: number;
  display: string;
}

interface SalesReportPayload {
  periodo?: {
    inicio?: string;
    fim?: string;
    dias?: number;
  };
  resumo?: {
    faturamento_bruto?: MetricValue;
    descontos?: MetricValue;
    faturamento_liquido?: MetricValue;
    quantidade_vendas?: MetricValue;
    ticket_medio?: MetricValue;
    total_itens?: MetricValue;
    clientes_unicos?: MetricValue;
  };
  formas_pagamento?: Array<{
    id: number | null;
    nome: string;
    valor: number;
    valor_display: string;
    participacao: number;
    participacao_display: string;
  }>;
  por_dia?: Array<{
    data: string;
    faturamento: number;
    faturamento_display: string;
    vendas: number;
    itens: number;
  }>;
  top_produtos?: Array<{
    produto_id: number | null;
    sku: string;
    nome: string;
    categoria: string;
    quantidade: number;
    quantidade_display: string;
    faturamento: number;
    faturamento_display: string;
    margem_percentual: number;
    margem_display: string;
  }>;
  top_clientes?: Array<{
    cliente_id: number | null;
    nome: string;
    compras: number;
    valor: number;
    valor_display: string;
    ticket_medio: number;
    ticket_medio_display: string;
    ultima_compra: string | null;
  }>;
}

interface SalesReportModalProps {
  report: ReportJob | null;
  isOpen: boolean;
  onClose: () => void;
}

const metricLabels: Record<keyof NonNullable<SalesReportPayload["resumo"]>, string> = {
  faturamento_bruto: "Faturamento bruto",
  descontos: "Descontos",
  faturamento_liquido: "Faturamento líquido",
  quantidade_vendas: "Quantidade de vendas",
  ticket_medio: "Ticket médio",
  total_itens: "Itens vendidos",
  clientes_unicos: "Clientes únicos",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const SalesReportModal = ({ report, isOpen, onClose }: SalesReportModalProps) => {
  if (!isOpen || !report) {
    return null;
  }

  const payload = (report.payload ?? {}) as SalesReportPayload;
  const resumo = (payload.resumo ?? {}) as NonNullable<SalesReportPayload["resumo"]>;
  const periodo = payload.periodo ?? {};
  const formasPagamento = (payload.formas_pagamento ?? []) as NonNullable<SalesReportPayload["formas_pagamento"]>;
  const porDia = (payload.por_dia ?? []) as NonNullable<SalesReportPayload["por_dia"]>;
  const topProdutos = (payload.top_produtos ?? []) as NonNullable<SalesReportPayload["top_produtos"]>;
  const topClientes = (payload.top_clientes ?? []) as NonNullable<SalesReportPayload["top_clientes"]>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Relatório</p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{report.tipo}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Período: {formatDate(periodo.inicio)} — {formatDate(periodo.fim)} ({periodo.dias ?? 0} dias)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-6">
          <Card title="Resumo" className="p-4 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(resumo) as Array<keyof typeof resumo>).map((key) => {
                const metric = resumo[key];
                if (!metric) return null;
                const label = metricLabels[key] ?? key;
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{metric.display}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Valor bruto: {metric.valor}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Formas de pagamento" className="p-4 md:p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Participação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formasPagamento.length ? (
                    formasPagamento.map((item) => (
                      <TableRow key={`pg-${item.id ?? item.nome}`}>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">
                          {item.valor_display}
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-500 dark:text-slate-400">
                          {item.participacao_display}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                        Nenhuma venda registrada no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card title="Vendas por dia" className="p-4 md:p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Cupons</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porDia.length ? (
                    porDia.map((item) => (
                      <TableRow key={item.data}>
                        <TableCell>{formatDate(item.data)}</TableCell>
                        <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">
                          {item.faturamento_display}
                        </TableCell>
                        <TableCell className="text-right text-sm">{item.vendas}</TableCell>
                        <TableCell className="text-right text-sm">{item.itens}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                        Sem vendas registradas no período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Top produtos" className="p-4 md:p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProdutos.length ? (
                    topProdutos.map((item) => (
                      <TableRow key={`prod-${item.produto_id ?? item.sku}`}>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{item.nome}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{item.quantidade_display}</TableCell>
                        <TableCell className="text-right font-medium">{item.faturamento_display}</TableCell>
                        <TableCell className="text-right text-sm text-slate-500 dark:text-slate-400">
                          {item.margem_display}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                        Nenhum produto vendido no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card title="Top clientes" className="p-4 md:p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientes.length ? (
                    topClientes.map((item) => (
                      <TableRow key={`cli-${item.cliente_id ?? item.nome}`}>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{item.nome}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Última compra: {formatDateTime(item.ultima_compra)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{item.compras}</TableCell>
                        <TableCell className="text-right font-medium">{item.valor_display}</TableCell>
                        <TableCell className="text-right text-sm">{item.ticket_medio_display}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                        Nenhum cliente identificado nas vendas do período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
