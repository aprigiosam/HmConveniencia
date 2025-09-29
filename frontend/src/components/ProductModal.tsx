import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import api from "../services/api";

type Categoria = {
  id: number;
  nome: string;
};

type Fornecedor = {
  id: number;
  nome: string;
};

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBarcode?: string;
};

export const ProductModal = ({ isOpen, onClose, onSuccess, initialBarcode }: ProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    sku: "",
    codigo_barras: "",
    nome: "",
    descricao: "",
    categoria: "",
    fornecedor: "",
    unidade: "UN",
    preco_custo: "",
    preco_venda: "",
    estoque_minimo: "0",
    controla_vencimento: false,
    dias_alerta_vencimento: "0",
    ativo: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialBarcode) {
      setFormData((prev) =>
        prev.codigo_barras === initialBarcode ? prev : { ...prev, codigo_barras: initialBarcode },
      );
    }

    const focusTimeout = window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [initialBarcode, isOpen]);

  const loadData = async () => {
    try {
      const [categoriasRes, fornecedoresRes] = await Promise.all([
        api.get("/catalog/categorias/", { params: { page_size: 100 } }),
        api.get("/catalog/fornecedores/", { params: { page_size: 100 } }),
      ]);
      setCategorias(categoriasRes.data.results || []);
      setFornecedores(fornecedoresRes.data.results || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/catalog/produtos/", {
        ...formData,
        categoria: parseInt(formData.categoria, 10),
        fornecedor: parseInt(formData.fornecedor, 10),
        preco_custo: parseFloat(formData.preco_custo),
        preco_venda: parseFloat(formData.preco_venda),
        estoque_minimo: parseInt(formData.estoque_minimo, 10),
        dias_alerta_vencimento: parseInt(formData.dias_alerta_vencimento, 10),
      });

      onSuccess();
      onClose();

      setFormData({
        sku: "",
        codigo_barras: "",
        nome: "",
        descricao: "",
        categoria: "",
        fornecedor: "",
        unidade: "UN",
        preco_custo: "",
        preco_venda: "",
        estoque_minimo: "0",
        controla_vencimento: false,
        dias_alerta_vencimento: "0",
        ativo: true,
      });
    } catch (error: any) {
      console.error("Erro ao salvar produto:", error);
      const message = error?.message ?? "Erro ao salvar produto";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Novo produto</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              required
              value={formData.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
            />
            <Input
              label="Codigo de barras"
              required
              ref={barcodeInputRef}
              value={formData.codigo_barras}
              onChange={(e) => handleChange("codigo_barras", e.target.value)}
            />
          </div>

          <Input
            label="Nome do produto"
            required
            value={formData.nome}
            onChange={(e) => handleChange("nome", e.target.value)}
          />

          <Input
            label="Descricao"
            value={formData.descricao}
            onChange={(e) => handleChange("descricao", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.categoria}
                onChange={(e) => handleChange("categoria", e.target.value)}
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fornecedor
              </label>
              <select
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.fornecedor}
                onChange={(e) => handleChange("fornecedor", e.target.value)}
              >
                <option value="">Selecione um fornecedor</option>
                {fornecedores.map((forn) => (
                  <option key={forn.id} value={forn.id}>
                    {forn.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Unidade"
              value={formData.unidade}
              onChange={(e) => handleChange("unidade", e.target.value)}
            />
            <Input
              label="Preco de custo"
              type="number"
              step="0.01"
              required
              value={formData.preco_custo}
              onChange={(e) => handleChange("preco_custo", e.target.value)}
            />
            <Input
              label="Preco de venda"
              type="number"
              step="0.01"
              required
              value={formData.preco_venda}
              onChange={(e) => handleChange("preco_venda", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estoque minimo"
              type="number"
              value={formData.estoque_minimo}
              onChange={(e) => handleChange("estoque_minimo", e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="controla_vencimento"
                checked={formData.controla_vencimento}
                onChange={(e) => handleChange("controla_vencimento", e.target.checked)}
              />
              <label htmlFor="controla_vencimento" className="text-sm">
                Controla vencimento
              </label>
            </div>
          </div>

          {formData.controla_vencimento && (
            <Input
              label="Dias de alerta de vencimento"
              type="number"
              value={formData.dias_alerta_vencimento}
              onChange={(e) => handleChange("dias_alerta_vencimento", e.target.value)}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
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
