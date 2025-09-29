import api from "./api";

type DashboardKpi = {
  id: string;
  title: string;
  value: number;
  value_display: string;
  change_display: string;
  trend: "up" | "down" | "neutral";
};

type SummaryMetric = {
  valor: number;
  display: string;
};

export type SalesSummaryKey =
  | "faturamento_bruto"
  | "descontos"
  | "faturamento_liquido"
  | "quantidade_vendas"
  | "ticket_medio"
  | "total_itens"
  | "clientes_unicos";

type DashboardTopProduct = {
  sku: string;
  nome: string;
  quantidade: number;
  quantidade_display: string;
  faturamento: number;
  faturamento_display: string;
  margem_percentual: number;
  margem_display: string;
};

type DashboardTopClient = {
  cliente_id: number | null;
  nome: string;
  compras: number;
  valor: number;
  valor_display: string;
  ticket_medio: number;
  ticket_medio_display: string;
  ultima_compra: string | null;
};

type DashboardPayment = {
  id: number | null;
  nome: string;
  valor: number;
  valor_display: string;
  participacao: number;
  participacao_display: string;
};

type DashboardTrendPoint = {
  data: string;
  faturamento: number;
  faturamento_display: string;
  vendas: number;
  itens: number;
};

type DashboardRuptura = {
  sku: string;
  nome: string;
  estoque: number;
  estoque_display: string;
  estoque_minimo: number;
};

export type DashboardMetricsResponse = {
  periodo: {
    inicio: string;
    fim: string;
    dias: number;
  };
  kpis: DashboardKpi[];
  sales_summary: Partial<Record<SalesSummaryKey, SummaryMetric>>;
  sales_trend: DashboardTrendPoint[];
  payments: DashboardPayment[];
  top_produtos: DashboardTopProduct[];
  top_clientes: DashboardTopClient[];
  rupturas: DashboardRuptura[];
};

type DashboardMetricsParams = {
  loja?: number;
  dataInicio?: string;
  dataFim?: string;
};

export const fetchDashboardMetrics = async (params?: DashboardMetricsParams) => {
  const query: Record<string, string | number> = {};
  if (typeof params?.loja === "number") {
    query.loja = params.loja;
  }
  if (params?.dataInicio) {
    query.data_inicio = params.dataInicio;
  }
  if (params?.dataFim) {
    query.data_fim = params.dataFim;
  }

  const { data } = await api.get<DashboardMetricsResponse>("/reports/dashboard/", {
    params: Object.keys(query).length ? query : undefined,
  });
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
