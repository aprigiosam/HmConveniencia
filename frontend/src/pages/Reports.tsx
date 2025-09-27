import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import toast from "react-hot-toast";

const jobs = [
  { id: 1, tipo: "Vendas por período", status: "Concluído", geradoEm: "26/09 09:10", link: "#" },
  { id: 2, tipo: "Curva ABC", status: "Processando", geradoEm: "-", link: "" },
];

export const ReportsPage = () => {
  const [executando, setExecutando] = useState(false);

  const solicitarRelatorio = (tipo: string) => {
    setExecutando(true);
    setTimeout(() => {
      toast.success(`Relatório ${tipo} enviado para processamento`);
      setExecutando(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card title="Relatórios rápidos">
        <div className="flex flex-wrap gap-3">
          {[
            "Vendas por período",
            "Ticket médio",
            "Ranking de produtos",
            "Margem por categoria",
            "Rupturas",
            "DRE simplificada",
          ].map((tipo) => (
            <Button key={tipo} onClick={() => solicitarRelatorio(tipo)} disabled={executando}>
              {tipo}
            </Button>
          ))}
        </div>
      </Card>

      <Card title="Histórico de relatórios">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Relatório</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gerado em</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{job.tipo}</TableCell>
                <TableCell>
                  <Badge tone={job.status === "Concluído" ? "success" : "warning"}>{job.status}</Badge>
                </TableCell>
                <TableCell>{job.geradoEm}</TableCell>
                <TableCell className="text-right">
                  {job.status === "Concluído" ? (
                    <Button variant="ghost" onClick={() => toast.success("Download iniciado (mock)")}>
                      Download
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">Em processamento</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
