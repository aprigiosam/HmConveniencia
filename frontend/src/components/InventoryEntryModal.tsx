import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type ProdutoResumo = {
  id: number;
  nome: string;
  sku: string;
  controla_vencimento?: boolean;
};

type ProdutoDetalhe = {
  id: number;
  nome: string;
  sku: string;
  controla_vencimento: boolean;
  dias_alerta_vencimento: number;
};

type Loja = {
  id: number;
  nome: string;
};

type InventoryEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const defaultForm = {
  produto: "",
  loja: "",
  numero_lote: "",
  data_vencimento: "",
  quantidade: "1",
  custo_unitario: "",
  motivo: "Entrada de estoque",
  observacoes: "",
};

export const InventoryEntryModal = ({ isOpen, onClose, onSuccess }: InventoryEntryModalProps) => {
  const [formData, setFormData] = useState(defaultForm);
  const [produtos, setProdutos] = useState<ProdutoResumo[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoDetalhe | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    const loadOptions = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [produtosRes, lojasRes] = await Promise.all([
          api.get("/catalog/produtos/", { params: { page_size: 100 } }),
          api.get("/lojas/", { params: { page_size: 100 } }),
        ]);

        const produtosData: ProdutoResumo[] = produtosRes.data.results ?? produtosRes.data ?? [];
        const lojasData: Loja[] = lojasRes.data.results ?? lojasRes.data ?? [];

        if (!active) {
          return;
        }

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
        const message = error?.message ?? "Erro ao carregar dados de estoque";
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
    if (!isOpen || !formData.produto) {
      setProdutoSelecionado(null);
      return;
    }

    let active = true;

    const loadProdutoDetalhe = async () => {
      try {
        const { data } = await api.get(`/catalog/produtos/${formData.produto}/`);
        if (active) {
          setProdutoSelecionado(data);
        }
      } catch (error) {
        if (active) {
          setProdutoSelecionado(null);
        }
      }
    };

    loadProdutoDetalhe();

    return () => {
      active = false;
    };
  }, [formData.produto, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFormData(defaultForm);
      setProdutos([]);
      setLojas([]);
      setProdutoSelecionado(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const requiresExpiry = useMemo(() => produtoSelecionado?.controla_vencimento ?? false, [produtoSelecionado]);

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

    if (!formData.numero_lote.trim()) {
      setErrorMessage("Informe o número do lote");
      return;
    }

    if (!formData.quantidade || Number.isNaN(Number(formData.quantidade)) || Number(formData.quantidade) <= 0) {
      setErrorMessage("Quantidade deve ser maior que zero");
      return;
    }

    if (!formData.custo_unitario || Number.isNaN(Number(formData.custo_unitario))) {
      setErrorMessage("Informe o custo unitário");
      return;
    }

    if (requiresExpiry && !formData.data_vencimento) {
      setErrorMessage("Informe a data de vencimento para este produto");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api.post("/inventory/estoque/entrada_estoque/", {
        produto: parseInt(formData.produto, 10),
        loja: formData.loja ? parseInt(formData.loja, 10) : undefined,
        numero_lote: formData.numero_lote.trim(),
        quantidade: parseInt(formData.quantidade, 10),
        custo_unitario: parseFloat(formData.custo_unitario),
        data_vencimento: formData.data_vencimento || null,
        motivo: formData.motivo || "Entrada de estoque",
        observacoes: formData.observacoes || undefined,
      });

      onSuccess();
      setFormData(defaultForm);
    } catch (error: any) {
      const message = error?.message ?? "Erro ao registrar entrada";
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
          <h2 className="text-xl font-semibold">Registrar entrada de estoque</h2>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Número do lote"
              required
              value={formData.numero_lote}
              onChange={(event) => handleChange("numero_lote", event.target.value)}
              disabled={submitting}
            />

            <Input
              label="Quantidade"
              type="number"
              min="1"
              required
              value={formData.quantidade}
              onChange={(event) => handleChange("quantidade", event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Custo unitário"
              type="number"
              step="0.01"
              required
              value={formData.custo_unitario}
              onChange={(event) => handleChange("custo_unitario", event.target.value)}
              disabled={submitting}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de vencimento {requiresExpiry ? "*" : "(opcional)"}
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.data_vencimento}
                onChange={(event) => handleChange("data_vencimento", event.target.value)}
                required={requiresExpiry}
                disabled={submitting}
              />
              {requiresExpiry && (
                <p className="mt-1 text-xs text-gray-500">
                  O produto selecionado exige controle de vencimento.
                </p>
              )}
            </div>
          </div>

          <Input
            label="Motivo"
            value={formData.motivo}
            onChange={(event) => handleChange("motivo", event.target.value)}
            disabled={submitting}
          />

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
              {submitting ? "Registrando..." : "Registrar entrada"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
