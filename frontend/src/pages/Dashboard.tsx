import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Users, DollarSign, ShoppingCart, PackageCheck } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { DashboardMetricsResponse, fetchDashboardMetrics } from "../services/reports";

const iconByKpi: Record<string, typeof DollarSign> = {
  faturamento: DollarSign,
  vendas: ShoppingCart,
  clientes_fidelidade: Users,
  rupturas: PackageCheck,
  ticket_medio: DollarSign,
};

export const DashboardPage = () => {
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        const message = (error as { message?: string }).message ?? "Não foi possível carregar o dashboard";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const kpis = useMemo(() => metrics?.kpis ?? [], [metrics]);
  const topProducts = useMemo(() => metrics?.top_produtos ?? [], [metrics]);
  const ruptures = useMemo(() => metrics?.rupturas ?? [], [metrics]);

  return (
    <div className="space-y-6">
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
                    <p className="text-sm text-slate-500">{item.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value_display}</p>
                  </div>
                  <div className="rounded-full bg-blue-50 p-3 text-blue-600">
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Produtos mais vendidos">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtde</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !topProducts.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                    Carregando produtos...
                  </TableCell>
                </TableRow>
              ) : topProducts.length ? (
                topProducts.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell className="font-mono text-xs uppercase text-slate-500">{product.sku}</TableCell>
                    <TableCell>{product.nome}</TableCell>
                    <TableCell>{product.quantidade.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{product.faturamento_display}</TableCell>
                    <TableCell>
                      <Badge tone="success">{product.margem_display}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                    Ainda não há vendas registradas para este período.
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
                <TableHead>Estoque</TableHead>
                <TableHead>Mínimo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !ruptures.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    Buscando rupturas...
                  </TableCell>
                </TableRow>
              ) : ruptures.length ? (
                ruptures.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell className="font-mono text-xs uppercase text-red-500">{item.sku}</TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{item.estoque_display}</TableCell>
                    <TableCell>{item.estoque_minimo}</TableCell>
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
