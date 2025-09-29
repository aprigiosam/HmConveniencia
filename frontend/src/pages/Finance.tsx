import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

const caixa = {
  status: "Aberto",
  operador: "João",
  saldoInicial: "R$ 200,00",
  vendas: "R$ 1.245,00",
  suprimentos: "R$ 150,00",
  sangrias: "R$ 50,00",
};

const contasReceber = [
  { id: 1, cliente: "Maria Silva", documento: "Venda #1023", vencimento: "30/09", valor: "R$ 120,00", status: "Em aberto" },
  { id: 2, cliente: "José Lima", documento: "Venda #1031", vencimento: "02/10", valor: "R$ 85,00", status: "Em aberto" },
];

const contasPagar = [
  { id: 1, fornecedor: "Distribuidora Central", documento: "NF 1983", vencimento: "28/09", valor: "R$ 2.400,00", status: "A vencer" },
];

export const FinancePage = () => (
  <div className="space-y-6">
    <Card
      title="Caixa do dia"
      action={<Button onClick={() => alert("Fechamento iniciado (mock)")}>Fechar caixa</Button>}
    >
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <Badge tone={caixa.status === "Aberto" ? "success" : "warning"}>{caixa.status}</Badge>
        </div>
        <div>
          <p className="text-xs text-slate-500">Operador</p>
          <p className="font-medium text-slate-800">{caixa.operador}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Saldo inicial</p>
          <p>{caixa.saldoInicial}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Vendas</p>
          <p>{caixa.vendas}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Suprimentos</p>
          <p>{caixa.suprimentos}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Sangrias</p>
          <p>{caixa.sangrias}</p>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Contas a receber" action={<Button variant="ghost">Exportar</Button>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contasReceber.map((conta) => (
              <TableRow key={conta.id}>
                <TableCell>{conta.cliente}</TableCell>
                <TableCell>{conta.documento}</TableCell>
                <TableCell>{conta.vencimento}</TableCell>
                <TableCell>{conta.valor}</TableCell>
                <TableCell>
                  <Badge tone="warning">{conta.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card title="Contas a pagar" action={<Button variant="ghost">Exportar</Button>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contasPagar.map((conta) => (
              <TableRow key={conta.id}>
                <TableCell>{conta.fornecedor}</TableCell>
                <TableCell>{conta.documento}</TableCell>
                <TableCell>{conta.vencimento}</TableCell>
                <TableCell>{conta.valor}</TableCell>
                <TableCell>
                  <Badge tone="warning">{conta.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  </div>
);
