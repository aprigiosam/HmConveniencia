import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

const pedidos = [
  { id: 1, fornecedor: "Distribuidora Central", total: "R$ 3.240,00", status: "Aguardando", previsao: "27/09/2025" },
  { id: 2, fornecedor: "Atacadão", total: "R$ 1.980,00", status: "Recebido", previsao: "24/09/2025" },
];

const recebimentos = [
  { id: 1, documento: "NF 12345", data: "24/09/2025", itens: 48, responsavel: "Marcos" },
];

export const PurchasesPage = () => {
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card
        title="Pedidos de compra"
        action={<Button onClick={() => alert("Pedido criado (mock)")}>Novo pedido</Button>}
      >
        <div className="flex gap-2">
          {["Todos", "Aguardando", "Enviado", "Recebido"].map((status) => (
            <Button
              key={status}
              variant={filtroStatus === status || (status === "Todos" && filtroStatus === null) ? "primary" : "secondary"}
              onClick={() => setFiltroStatus(status === "Todos" ? null : status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos
              .filter((pedido) => (filtroStatus ? pedido.status === filtroStatus : true))
              .map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.fornecedor}</TableCell>
                  <TableCell>{pedido.total}</TableCell>
                  <TableCell>
                    <Badge tone={pedido.status === "Recebido" ? "success" : "warning"}>{pedido.status}</Badge>
                  </TableCell>
                  <TableCell>{pedido.previsao}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => alert("Detalhes do pedido (mock)")}>Detalhes</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <Card title="Recebimentos recentes">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recebimentos.map((recebimento) => (
              <TableRow key={recebimento.id}>
                <TableCell>{recebimento.documento}</TableCell>
                <TableCell>{recebimento.data}</TableCell>
                <TableCell>{recebimento.itens}</TableCell>
                <TableCell>{recebimento.responsavel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
