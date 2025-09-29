import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type ProdutoResumo = {
  id: number;
  nome: string;
  sku: string;
};

type Loja = {
  id: number;
  nome: string;
};

type LoteResumo = {
  id: number;
  numero_lote: string;
  quantidade: number;
  loja: number;
  loja_nome: string;
  data_vencimento: string | null;
};

type InventoryAdjustmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const defaultForm = {
  produto: "",
  loja: "",
  lote: "",
  quantidade: "0",
  motivo: "Ajuste de estoque",
  observacoes: "",
};

export const InventoryAdjustmentModal = ({ isOpen, onClose, onSuccess }: InventoryAdjustmentModalProps) => {
  const [formData, setFormData] = useState(defaultForm);
  const [produtos, setProdutos] = useState<ProdutoResumo[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lotes, setLotes] = useState<LoteResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;
    setLoading(true);

    const loadOptions = async () => {
      try {
        const [produtosRes, lojasRes] = await Promise.all([
          api.get("/catalog/produtos/", { params: { page_size: 100 } }),
          api.get("/lojas/", { params: { page_size: 100 } }),
        ]);

        if (!active) {
          return;
        }

        const produtosData: ProdutoResumo[] = produtosRes.data.results ?? produtosRes.data ?? [];
        const lojasData: Loja[] = lojasRes.data.results ?? lojasRes.data ?? [];

        setProdutos(produtosData);
        setLojas(lojasData);

        setFormData((prev) => {
          const next = { ...prev };
          if (!prev.loja && lojasData.length === 1) {
            next.loja = String(lojasData[0].id);
          }
          return next;
        });
      } catch (error: any) {
        if (!active) {
          return;
        }
        const message = error?.message ?? "Erro ao carregar dados";
        setErrorMessage(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFormData(defaultForm);
      setProdutos([]);
      setLojas([]);
      setLotes([]);
      setErrorMessage(null);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !formData.produto) {
      setLotes([]);
      setFormData((prev) => ({ ...prev, lote: "" }));
      return;
    }

    let active = true;
    setLoadingLotes(true);

    const loadLotes = async () => {
      try {
        const { data } = await api.get("/inventory/lotes/", {
          params: { produto: formData.produto },
        });
        if (!active) {
          return;
        }
        const lotesData: LoteResumo[] = data.results ?? data ?? [];
        setLotes(lotesData);
      } catch (error) {
        if (active) {
          setLotes([]);
        }
      } finally {
        if (active) {
          setLoadingLotes(false);
        }
      }
    };

    loadLotes();

    return () => {
      active = false;
    };
  }, [formData.produto, isOpen]);

  useEffect(() => {
    if (!formData.lote) {
      return;
    }

    const loteInfo = lotes.find((lote) => String(lote.id) === formData.lote);
    if (loteInfo && formData.loja !== String(loteInfo.loja)) {
      setFormData((prev) => ({ ...prev, loja: String(loteInfo.loja) }));
    }
  }, [formData.lote, formData.loja, lotes]);

  const filteredLotes = useMemo(() => {
    if (!formData.loja) {
      return lotes;
    }
    return lotes.filter((lote) => String(lote.loja) === formData.loja);
  }, [lotes, formData.loja]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.produto) {
      setErrorMessage("Selecione um produto");
      return;
    }

    if (!formData.loja) {
      setErrorMessage("Selecione a loja");
      return;
    }

    if (!formData.quantidade || Number.isNaN(Number(formData.quantidade)) || Number(formData.quantidade) < 0) {
      setErrorMessage("Quantidade deve ser zero ou maior");
      return;
    }

    if (!formData.motivo.trim()) {
      setErrorMessage("Informe o motivo do ajuste");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api.post("/inventory/estoque/ajuste_estoque/", {
        produto: parseInt(formData.produto, 10),
        loja: parseInt(formData.loja, 10),
        lote: formData.lote ? parseInt(formData.lote, 10) : undefined,
        quantidade: parseInt(formData.quantidade, 10),
        motivo: formData.motivo,
        observacoes: formData.observacoes || undefined,
      });

      onSuccess();
      setFormData(defaultForm);
    } catch (error: any) {
      const message = error?.message ?? "Erro ao ajustar estoque";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ajustar estoque</h2>
          <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={handleClose}>
            Fechar
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Produto</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.produto}
                onChange={(event) => handleChange("produto", event.target.value)}
                disabled={loading || submitting}
                required
              >
                <option value="">Selecione um produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} ({produto.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Loja</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.loja}
                onChange={(event) => handleChange("loja", event.target.value)}
                disabled={loading || submitting || lojas.length <= 1}
              >
                <option value="">Selecione uma loja</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
              {lojas.length <= 1 && (
                <p className="mt-1 text-xs text-gray-500">Loja selecionada automaticamente.</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Lote (opcional)
              {loadingLotes && <span className="ml-2 text-xs text-slate-500">Carregando...</span>}
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={formData.lote}
              onChange={(event) => handleChange("lote", event.target.value)}
              disabled={submitting || loadingLotes || filteredLotes.length === 0}
            >
              <option value="">Sem lote específico</option>
              {filteredLotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {`${lote.numero_lote} • ${lote.loja_nome} • Qtde ${lote.quantidade}`}
                </option>
              ))}
            </select>
            {formData.produto && lotes.length === 0 && !loadingLotes && (
              <p className="mt-1 text-xs text-gray-500">Produto sem lotes cadastrados.</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Quantidade final"
              type="number"
              min="0"
              required
              value={formData.quantidade}
              onChange={(event) => handleChange("quantidade", event.target.value)}
              disabled={submitting}
            />

            <Input
              label="Motivo"
              required
              value={formData.motivo}
              onChange={(event) => handleChange("motivo", event.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              value={formData.observacoes}
              onChange={(event) => handleChange("observacoes", event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || loading}>
              {submitting ? "Salvando..." : "Salvar ajuste"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

