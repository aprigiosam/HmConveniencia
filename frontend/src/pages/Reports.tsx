import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import toast from "react-hot-toast";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { listReportJobs, ReportJob, requestReportJob } from "../services/reports";

const quickReports = [
  "Vendas por período",
  "Ticket médio",
  "Ranking de produtos",
  "Margem por categoria",
  "Rupturas",
  "DRE simplificada",
];

const badgeToneByStatus: Record<string, "success" | "warning" | "danger"> = {
  CONCLUIDO: "success",
  PROCESSANDO: "warning",
  PENDENTE: "warning",
  ERRO: "danger",
};

export const ReportsPage = () => {
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [executando, setExecutando] = useState(false);

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const data = await listReportJobs();
      setJobs(data);
    } catch (error) {
      const message = (error as { message?: string }).message ?? "Não foi possível carregar os relatórios";
      toast.error(message);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleSolicitarRelatorio = async (tipo: string) => {
    try {
      setExecutando(true);
      await requestReportJob({ tipo });
      toast.success(`Relatório ${tipo} enviado para processamento`);
      await loadJobs();
    } catch (error) {
      const message = (error as { message?: string }).message ?? "Falha ao solicitar relatório";
      toast.error(message);
    } finally {
      setExecutando(false);
    }
  };

  const jobsOrdenados = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [jobs],
  );

  const formatDate = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  };

  const handleDownload = (job: ReportJob) => {
    if (job.status !== "CONCLUIDO") return;
    console.info("Payload do relatório", job.payload);
    toast.success("Relatório disponível nos dados retornados pela API.");
  };

  return (
    <div className="space-y-6">
      <Card title="Relatórios rápidos">
        <div className="flex flex-wrap gap-3">
          {quickReports.map((tipo) => (
            <Button key={tipo} onClick={() => handleSolicitarRelatorio(tipo)} disabled={executando}>
              {tipo}
            </Button>
          ))}
          <Button variant="secondary" onClick={loadJobs} disabled={loadingJobs}>
            Atualizar lista
          </Button>
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
            {loadingJobs && !jobsOrdenados.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  Carregando histórico...
                </TableCell>
              </TableRow>
            ) : jobsOrdenados.length ? (
              jobsOrdenados.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.tipo}</TableCell>
                  <TableCell>
                    <Badge tone={badgeToneByStatus[job.status] ?? "warning"}>{job.status}</Badge>
                  </TableCell>
                  <TableCell>{job.concluido_em ? formatDate(job.concluido_em) : "Em processamento"}</TableCell>
                  <TableCell className="text-right">
                    {job.status === "CONCLUIDO" ? (
                      <Button variant="ghost" onClick={() => handleDownload(job)}>
                        Ver dados
                      </Button>
                    ) : job.status === "ERRO" ? (
                      <span className="text-xs text-red-500">Falha ao gerar</span>
                    ) : (
                      <span className="text-xs text-slate-400">Em processamento</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  Nenhum relatório solicitado até o momento.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
