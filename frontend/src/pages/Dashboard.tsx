import { ArrowUpRight, ArrowDownRight, Users, DollarSign, ShoppingCart, PackageCheck } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

const kpis = [
  {
    title: "Faturamento Hoje",
    value: "R$ 5.320,00",
    change: "+12% vs. ontem",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Vendas",
    value: "86 cupons",
    change: "+8%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    title: "Clientes Fidelidade",
    value: "1.245",
    change: "+24 novos",
    trend: "up",
    icon: Users,
  },
  {
    title: "Rupturas",
    value: "12 itens",
    change: "-3",
    trend: "down",
    icon: PackageCheck,
  },
];

const topProducts = [
  { sku: "COCA001", nome: "Coca-Cola 350ml", vendas: 126, faturamento: "R$ 441,00", margem: "28%" },
  { sku: "SNACK02", nome: "Batata Chips 90g", vendas: 88, faturamento: "R$ 352,00", margem: "32%" },
  { sku: "LIMP01", nome: "Detergente Neutro", vendas: 64, faturamento: "R$ 192,00", margem: "25%" },
];

const ruptures = [
  { sku: "ARROZ01", nome: "Arroz Tipo 1 5kg", estoque: "5 un", minimo: "20 un" },
  { sku: "LEITE01", nome: "Leite Integral 1L", estoque: "8 un", minimo: "24 un" },
];

export const DashboardPage = () => (
  <div className="space-y-6">
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((item) => {
        const Icon = item.icon;
        const trendUp = item.trend === "up";
        return (
          <Card key={item.title} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                <Icon size={20} />
              </div>
            </div>
            <span
              className={`inline-flex items-center text-sm font-medium ${trendUp ? "text-emerald-600" : "text-red-600"}`}
            >
              {trendUp ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
              {item.change}
            </span>
          </Card>
        );
      })}
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
            {topProducts.map((product) => (
              <TableRow key={product.sku}>
                <TableCell className="font-mono text-xs uppercase text-slate-500">{product.sku}</TableCell>
                <TableCell>{product.nome}</TableCell>
                <TableCell>{product.vendas}</TableCell>
                <TableCell>{product.faturamento}</TableCell>
                <TableCell>
                  <Badge tone="success">{product.margem}</Badge>
                </TableCell>
              </TableRow>
            ))}
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
            {ruptures.map((item) => (
              <TableRow key={item.sku}>
                <TableCell className="font-mono text-xs uppercase text-red-500">{item.sku}</TableCell>
                <TableCell>{item.nome}</TableCell>
                <TableCell>{item.estoque}</TableCell>
                <TableCell>{item.minimo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  </div>
);
