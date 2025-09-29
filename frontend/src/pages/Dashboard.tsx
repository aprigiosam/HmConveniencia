import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  PackageCheck,
  RefreshCcw,
  ShoppingCart,
  Users,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import toast from "react-hot-toast";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import {
  DashboardMetricsResponse,
  SalesSummaryKey,
  fetchDashboardMetrics,
} from "../services/reports";

const iconByKpi: Record<string, typeof DollarSign> = {
  faturamento: DollarSign,
  vendas: ShoppingCart,
  clientes_fidelidade: Users,
  ticket_medio: DollarSign,
  rupturas: PackageCheck,
};

const summaryLabels: Record<SalesSummaryKey, string> = {
  faturamento_bruto: "Faturamento bruto",
  descontos: "Descontos",
  faturamento_liquido: "Faturamento líquido",
  quantidade_vendas: "Quantidade de vendas",
  ticket_medio: "Ticket médio",
  total_itens: "Itens vendidos",
  clientes_unicos: "Clientes únicos",
};

const formatCurrencyFallback = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TrendBarChart = ({
  data,
  isLoading,
}: {
  data: DashboardMetricsResponse["sales_trend"];
  isLoading: boolean;
}) => {
  if (isLoading && !data.length) {
    return <p className="text-sm text-slate-500">Carregando evolução...</p>;
  }

  if (!data.length) {
    return <p className="text-sm text-slate-500">Sem vendas registradas no período.</p>;
  }

  const limited = data.slice(-12);
  const maxValue = Math.max(...limited.map((item) => item.faturamento));

  return (
    <div className="flex h-44 items-end gap-3">
      {limited.map((item) => {
        const value = item.faturamento;
        const heightPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 6 : 0) : 0;
        const dateLabel = format(parseISO(item.data), "dd/MM", { locale: ptBR });
        return (
          <div key={item.data} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end rounded-md bg-slate-100 dark:bg-slate-800/60">
              <div
                className="w-full rounded-md bg-gradient-to-t from-blue-600 to-blue-400 transition-[height] dark:from-blue-500 dark:to-blue-300"
                style={{ height: `${heightPercent}%` }}
                title={`${dateLabel} • ${item.faturamento_display}`}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{dateLabel}</span>
          </div>
        );
      })}
    </div>
  );
};

const PaymentBreakdown = ({ data }: { data: DashboardMetricsResponse["payments"] }) => {
  if (!data.length) {
    return <p className="text-sm text-slate-500">Sem pagamentos registrados no período.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={`payment-${item.id ?? item.nome}`} className="space-y-1">
          <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>{item.nome}</span>
            <span>{item.valor_display}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
              style={{ width: `${Math.min(item.participacao, 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{item.participacao_display} do faturamento</div>
        </div>
      ))}
    </div>
  );
};

export const DashboardPage = () => {
  const hoje = useMemo(() => new Date(), []);
  const [dataInicio, setDataInicio] = useState(() => format(subDays(hoje, 29), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(() => format(hoje, "yyyy-MM-dd"));

  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRangeShortcut = (days: number) => {
    const fim = dataFim ? parseISO(dataFim) : hoje;
    const novoInicio = format(subDays(fim, days - 1), "yyyy-MM-dd");
    setDataInicio(novoInicio);
  };

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardMetrics({ dataInicio, dataFim });
      setMetrics(data);
    } catch (error) {
      const message = (error as { message?: string }).message ?? "Não foi possível carregar o dashboard";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dataFim, dataInicio]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const kpis = metrics?.kpis ?? [];
  const salesSummary = metrics?.sales_summary ?? {};
  const summaryOrder: SalesSummaryKey[] = [
    "faturamento_liquido",
    "faturamento_bruto",
    "descontos",
    "quantidade_vendas",
    "ticket_medio",
    "total_itens",
    "clientes_unicos",
  ];

  const trendData = metrics?.sales_trend ?? [];
  const payments = metrics?.payments ?? [];
  const topProdutos = metrics?.top_produtos ?? [];
  const topClientes = metrics?.top_clientes ?? [];
  const rupturas = metrics?.rupturas ?? [];
  const periodoInfo = metrics?.periodo;

  return (
    <div className="space-y-6">
      <Card
        title="Filtro de período"
        action={
          <Button variant="ghost" icon={<RefreshCcw size={16} />} onClick={loadMetrics} disabled={loading}>
            Atualizar
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))] md:items-end">
          <Input
            type="date"
            label="Data inicial"
            value={dataInicio}
            max={dataFim}
            onChange={(event) => setDataInicio(event.target.value)}
          />
          <Input
            type="date"
            label="Data final"
            value={dataFim}
            max={format(hoje, "yyyy-MM-dd")}
            min={dataInicio}
            onChange={(event) => setDataFim(event.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => handleRangeShortcut(7)} disabled={loading}>
              Últimos 7 dias
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleRangeShortcut(30)} disabled={loading}>
              Últimos 30 dias
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => handleRangeShortcut(90)} disabled={loading}>
              Últimos 90 dias
            </Button>
          </div>
        </div>
        {periodoInfo ? (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Analisando vendas de {format(parseISO(periodoInfo.inicio), "dd 'de' MMMM", { locale: ptBR })} até
            {" "}
            {format(parseISO(periodoInfo.fim), "dd 'de' MMMM", { locale: ptBR })} ({periodoInfo.dias} dias).
          </p>
        ) : null}
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loading && !kpis.length ? (
          <Card className="flex flex-col gap-3 p-6">
            <p className="text-sm text-slate-500">Carregando indicadores...</p>
          </Card>
        ) : (
          kpis.map((item) => {
            const Icon = iconByKpi[item.id] ?? DollarSign;
            const trendUp = item.trend === "up";
            const trendDown = item.trend === "down";
            const trendClass = trendUp ? "text-emerald-600" : trendDown ? "text-red-600" : "text-slate-500";
            return (
              <Card key={item.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.value_display}</p>
                  </div>
                  <div className="rounded-full bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    <Icon size={20} />
                  </div>
                </div>
                <span className={`inline-flex items-center text-sm font-medium ${trendClass}`}>
                  {trendUp && <ArrowUpRight size={16} className="mr-1" />}
                  {trendDown && <ArrowDownRight size={16} className="mr-1" />}
                  {item.change_display}
                </span>
              </Card>
            );
          })
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card title="Resumo financeiro">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryOrder.map((key) => {
              const metric = salesSummary[key];
              if (!metric) return null;
              const isCurrency = [
                "faturamento_bruto",
                "descontos",
                "faturamento_liquido",
                "ticket_medio",
              ].includes(key);
              const rawValue = isCurrency
                ? formatCurrencyFallback(metric.valor)
                : metric.valor.toLocaleString("pt-BR");
              return (
                <div
                  key={key}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{summaryLabels[key]}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{metric.display}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isCurrency ? "Valor numérico" : "Quantidade"}: {rawValue}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Participação por forma de pagamento">
          <PaymentBreakdown data={payments} />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card title="Tendência de faturamento">
          <TrendBarChart data={trendData} isLoading={loading} />
        </Card>

        <Card title="Top clientes">
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
              {loading && !topClientes.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : topClientes.length ? (
                topClientes.map((cliente) => (
                  <TableRow key={`cli-${cliente.cliente_id ?? cliente.nome}`}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{cliente.nome}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Última compra:{" "}
                        {cliente.ultima_compra
                          ? format(parseISO(cliente.ultima_compra), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{cliente.compras}</TableCell>
                    <TableCell className="text-right font-medium">{cliente.valor_display}</TableCell>
                    <TableCell className="text-right text-sm">{cliente.ticket_medio_display}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    Sem clientes identificados neste período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Produtos mais vendidos">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtde</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !topProdutos.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                    Carregando produtos...
                  </TableCell>
                </TableRow>
              ) : topProdutos.length ? (
                topProdutos.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">
                      {product.sku}
                    </TableCell>
                    <TableCell>{product.nome}</TableCell>
                    <TableCell className="text-right text-sm">{product.quantidade_display}</TableCell>
                    <TableCell className="text-right font-medium">{product.faturamento_display}</TableCell>
                    <TableCell className="text-right">
                      <Badge tone={product.margem_percentual >= 0 ? "success" : "danger"}>{product.margem_display}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                    Ainda não há produtos vendidos neste período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card title="Rupturas de estoque">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !rupturas.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    Buscando rupturas...
                  </TableCell>
                </TableRow>
              ) : rupturas.length ? (
                rupturas.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell className="font-mono text-xs uppercase text-red-500">{item.sku}</TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell className="text-right">{item.estoque_display}</TableCell>
                    <TableCell className="text-right">{item.estoque_minimo}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    Parabéns! Nenhum item abaixo do estoque mínimo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
};
