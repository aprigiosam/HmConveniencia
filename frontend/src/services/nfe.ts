import api from "./api";

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type NfeEnvironment = "HOMOLOG" | "PROD";

export type NfeConfig = {
  id: number;
  loja: number;
  loja_nome: string;
  serie: number;
  proximo_numero: number;
  ambiente: NfeEnvironment;
  regime_tributario: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  certificado_nome: string;
  certificado_senha: string;
  certificado_arquivo_b64: string;
  csc_id: string;
  csc_token: string;
  created_at: string;
  updated_at: string;
};

export const listNfeConfigs = async () => {
  const { data } = await api.get<PaginatedResponse<NfeConfig>>("/nfe/configuracoes/");
  return data;
};

export const upsertNfeConfig = async (payload: Partial<NfeConfig>) => {
  if (payload.id) {
    const { data } = await api.patch<NfeConfig>(`/nfe/configuracoes/${payload.id}/`, payload);
    return data;
  }
  const { data } = await api.post<NfeConfig>("/nfe/configuracoes/", payload);
  return data;
};

export type NfeNota = {
  id: number;
  config: NfeConfig;
  numero: number;
  serie: number;
  chave_acesso: string;
  status: string;
  motivo_status: string;
  total_produtos: string;
  total_notafiscal: string;
  impostos_totais: string;
  protocolo_autorizacao: string;
  dh_autorizacao: string | null;
  ambiente: NfeEnvironment;
  created_at: string;
};

export const listNotas = async () => {
  const { data } = await api.get<PaginatedResponse<NfeNota>>("/nfe/notas/");
  return data;
};

export const emitirNota = async (payload: { venda_id: number; loja_id?: number }) => {
  const { data } = await api.post("/nfe/notas/", payload);
  return data;
};
