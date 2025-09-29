import api from "./api";

type DashboardKpi = {
  id: string;
  title: string;
  value: number;
  value_display: string;
  change_display: string;
  trend: "up" | "down" | "neutral";
};

export type DashboardMetricsResponse = {
  kpis: DashboardKpi[];
  top_produtos: {
    sku: string;
    nome: string;
    quantidade: number;
    faturamento: number;
    faturamento_display: string;
    margem_percentual: number;
    margem_display: string;
  }[];
  rupturas: {
    sku: string;
    nome: string;
    estoque: number;
    estoque_display: string;
    estoque_minimo: number;
  }[];
};

export const fetchDashboardMetrics = async (loja?: number) => {
  const params = loja ? { loja } : undefined;
  const { data } = await api.get<DashboardMetricsResponse>("/reports/dashboard/", { params });
  return data;
};

export type ReportJob = {
  id: number;
  loja: number | null;
  tipo: string;
  parametros: Record<string, unknown>;
  status: string;
  payload: Record<string, unknown>;
  mensagem: string;
  created_at: string;
  updated_at: string;
  concluido_em: string | null;
};

export const listReportJobs = async (loja?: number) => {
  const params = loja ? { loja } : undefined;
  const { data } = await api.get<{results: ReportJob[]}>("/reports/jobs/", { params });
  return data.results || [];
};

export const requestReportJob = async (payload: { tipo: string; loja?: number; parametros?: Record<string, unknown> }) => {
  const body = {
    tipo: payload.tipo,
    parametros: payload.parametros ?? {},
    ...(payload.loja ? { loja: payload.loja } : {}),
  };
  const { data } = await api.post<ReportJob>("/reports/jobs/", body);
  return data;
};
