import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

const movimentos = [
  { id: 1, tipo: "Entrada", documento: "Compra #345", produto: "Coca-Cola 350ml", quantidade: 48, custo: "R$ 3,20", data: "26/09 10:30" },
  { id: 2, tipo: "Saída", documento: "Venda PDV #9123", produto: "Bala de menta", quantidade: 5, custo: "R$ 2,10", data: "26/09 11:05" },
  { id: 3, tipo: "Ajuste", documento: "Inventário", produto: "Papel higiênico", quantidade: -2, custo: "R$ 6,90", data: "25/09 19:10" },
];

const inventarios = [
  { id: 1, data: "25/09/2025", responsavel: "Maria", status: "Concluído", divergencias: 3 },
  { id: 2, data: "18/09/2025", responsavel: "João", status: "Em andamento", divergencias: 0 },
];

export const InventoryPage = () => {
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card
        title="Estoque"
        action={<Button onClick={() => alert("Importação via planilha em desenvolvimento")}>Importar SKU</Button>}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Todas", value: null },
            { label: "Entradas", value: "Entrada" },
            { label: "Saídas", value: "Saída" },
            { label: "Ajustes", value: "Ajuste" },
          ].map((option) => (
            <Button
              key={option.label}
              variant={option.value === filtroTipo ? "primary" : "secondary"}
              onClick={() => setFiltroTipo(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => alert("Relatório exportado (mock)")}>Exportar</Button>
        </div>
      </Card>

      <Card title="Movimentações recentes">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentos
              .filter((item) => (filtroTipo ? item.tipo === filtroTipo : true))
              .map((movimento) => (
                <TableRow key={movimento.id}>
                  <TableCell>
                    <Badge tone={movimento.tipo === "Entrada" ? "success" : movimento.tipo === "Saída" ? "danger" : "warning"}>
                      {movimento.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{movimento.documento}</TableCell>
                  <TableCell>{movimento.produto}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {movimento.quantidade > 0 ? "+" : ""}
                    {movimento.quantidade}
                  </TableCell>
                  <TableCell>{movimento.custo}</TableCell>
                  <TableCell>{movimento.data}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <Card
        title="Inventários físicos"
        action={<Button onClick={() => alert("Inventário iniciado (mock)")}>Novo inventário</Button>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Divergências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventarios.map((inventario) => (
              <TableRow key={inventario.id}>
                <TableCell>{inventario.data}</TableCell>
                <TableCell>{inventario.responsavel}</TableCell>
                <TableCell>
                  <Badge tone={inventario.status === "Concluído" ? "success" : "warning"}>{inventario.status}</Badge>
                </TableCell>
                <TableCell>{inventario.divergencias}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
