import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { NfeConfig, NfeEnvironment } from "../services/nfe";
import { upsertNfeConfig } from "../services/nfe";

type NfeConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  config?: NfeConfig | null;
  onSuccess: (config: NfeConfig) => void;
};

export const NfeConfigModal = ({ isOpen, onClose, config, onSuccess }: NfeConfigModalProps) => {
  const [formState, setFormState] = useState({
    loja: "",
    serie: "1",
    proximo_numero: "1",
    ambiente: "HOMOLOG" as NfeEnvironment,
    regime_tributario: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    certificado_nome: "",
    certificado_senha: "",
    certificado_arquivo_b64: "",
    csc_id: "",
    csc_token: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (config) {
        setFormState({
          loja: String(config.loja),
          serie: String(config.serie ?? 1),
          proximo_numero: String(config.proximo_numero ?? 1),
          ambiente: (config.ambiente ?? "HOMOLOG") as NfeEnvironment,
          regime_tributario: config.regime_tributario ?? "",
          inscricao_estadual: config.inscricao_estadual ?? "",
          inscricao_municipal: config.inscricao_municipal ?? "",
          certificado_nome: config.certificado_nome ?? "",
          certificado_senha: config.certificado_senha ?? "",
          certificado_arquivo_b64: config.certificado_arquivo_b64 ?? "",
          csc_id: config.csc_id ?? "",
          csc_token: config.csc_token ?? "",
        });
      } else {
        setFormState((prev) => ({
          ...prev,
          loja: "",
          serie: "1",
          proximo_numero: "1",
          ambiente: "HOMOLOG" as NfeEnvironment,
        }));
      }
    }
  }, [config, isOpen]);

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: field === "ambiente" ? (value as NfeEnvironment) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.loja) {
      toast.error("Selecione uma loja para emitir NF-e");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formState,
        id: config?.id,
        loja: Number(formState.loja),
        serie: Number(formState.serie || 1),
        proximo_numero: Number(formState.proximo_numero || 1),
        ambiente: formState.ambiente,
      };
      const result = await upsertNfeConfig(payload);
      toast.success("Configuração salva");
      onSuccess(result);
      onClose();
    } catch (error: any) {
      toast.error(error?.message ?? "Erro ao salvar configuração");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Configuração NF-e</h2>
          <button type="button" className="text-sm text-slate-500" onClick={onClose}>
            Fechar
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="ID da loja"
              required
              value={formState.loja}
              onChange={(event) => handleChange("loja", event.target.value)}
              helperText="Informe o ID da loja emissora (consultar cadastro de lojas)."
            />
            <Input
              label="Série"
              type="number"
              min="1"
              value={formState.serie}
              onChange={(event) => handleChange("serie", event.target.value)}
            />
            <Input
              label="Próximo número"
              type="number"
              min="1"
              value={formState.proximo_numero}
              onChange={(event) => handleChange("proximo_numero", event.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ambiente</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={formState.ambiente}
                onChange={(event) => handleChange("ambiente", event.target.value)}
              >
                <option value="HOMOLOG">Homologação</option>
                <option value="PROD">Produção</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Regime tributário"
              value={formState.regime_tributario}
              onChange={(event) => handleChange("regime_tributario", event.target.value)}
            />
            <Input
              label="Inscrição estadual"
              value={formState.inscricao_estadual}
              onChange={(event) => handleChange("inscricao_estadual", event.target.value)}
            />
            <Input
              label="Inscrição municipal"
              value={formState.inscricao_municipal}
              onChange={(event) => handleChange("inscricao_municipal", event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome do certificado"
              value={formState.certificado_nome}
              onChange={(event) => handleChange("certificado_nome", event.target.value)}
            />
            <Input
              label="Senha do certificado"
              type="password"
              value={formState.certificado_senha}
              onChange={(event) => handleChange("certificado_senha", event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Certificado A1 (base64)</label>
            <textarea
              className="h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={formState.certificado_arquivo_b64}
              onChange={(event) => handleChange("certificado_arquivo_b64", event.target.value)}
              placeholder="Cole o conteúdo base64 do certificado .pfx"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="CSC ID"
              value={formState.csc_id}
              onChange={(event) => handleChange("csc_id", event.target.value)}
            />
            <Input
              label="CSC Token"
              value={formState.csc_token}
              onChange={(event) => handleChange("csc_token", event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
