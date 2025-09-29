import { type FormEvent, useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import toast from "react-hot-toast";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { SalesReportModal } from "../components/SalesReportModal";
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
  const [selectedReport, setSelectedReport] = useState<ReportJob | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [dataInicio, setDataInicio] = useState(() => format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(() => format(new Date(), "yyyy-MM-dd"));

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

  const handleGerarRelatorioCompleto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (inicio > fim) {
      toast.error("Data inicial não pode ser maior que a final");
      return;
    }

    try {
      setExecutando(true);
      await requestReportJob({
        tipo: "Relatório de vendas completo",
        parametros: {
          data_inicio: dataInicio,
          data_fim: dataFim,
        },
      });
      toast.success("Relatório completo enviado para processamento");
      await loadJobs();
    } catch (error) {
      const message = (error as { message?: string }).message ?? "Falha ao gerar relatório completo";
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
    if (job.tipo?.toLowerCase().includes("completo")) {
      setSelectedReport(job);
      setShowModal(true);
      return;
    }

    console.info("Payload do relatório", job.payload);
    toast.success("Relatório disponível nos dados retornados pela API.");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReport(null);
  };

  const todayFormatted = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  return (
    <div className="space-y-6">
      <Card title="Relatório de vendas completo">
        <form className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))] md:items-end" onSubmit={handleGerarRelatorioCompleto}>
          <Input
            type="date"
            label="Data inicial"
            value={dataInicio}
            max={todayFormatted}
            onChange={(event) => setDataInicio(event.target.value)}
          />
          <Input
            type="date"
            label="Data final"
            value={dataFim}
            max={todayFormatted}
            min={dataInicio}
            onChange={(event) => setDataFim(event.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={executando} fullWidth>
              Gerar relatório completo
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          O relatório inclui resumo financeiro, participação por forma de pagamento, evolução diária e ranking dos principais produtos e clientes.
        </p>
      </Card>

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

      <SalesReportModal report={selectedReport} isOpen={showModal} onClose={handleCloseModal} />
    </div>
  );
};
