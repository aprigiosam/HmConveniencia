import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import api from "../services/api";
import { CategoryModal } from "./CategoryModal";
import { SupplierModal } from "./SupplierModal";

type Categoria = {
  id: number;
  nome: string;
  categoria_pai: number | null;
};

type CategoriaOption = Categoria & {
  displayName: string;
};

type Fornecedor = {
  id: number;
  nome: string;
};

type LoteProduto = {
  numero_lote: string;
  data_vencimento?: string;
  quantidade: number;
  custo_unitario: number;
};

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBarcode?: string;
  mode?: 'create' | 'entry';
};

export const ProductModal = ({ isOpen, onClose, onSuccess, initialBarcode, mode = 'create' }: ProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
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

  const [loteData, setLoteData] = useState<LoteProduto>({
    numero_lote: "",
    data_vencimento: "",
    quantidade: 0,
    custo_unitario: 0,
  });

  const [createWithEntry, setCreateWithEntry] = useState(mode === 'entry');

  const loadData = useCallback(async () => {
    try {
      const [categoriasRes, fornecedoresRes] = await Promise.all([
        api.get("/catalog/categorias/", { params: { page_size: 100 } }),
        api.get("/catalog/fornecedores/", { params: { page_size: 100 } }),
      ]);
      const fetchedCategorias: Categoria[] = (categoriasRes.data.results || []).map((categoria: any) => ({
        id: categoria.id,
        nome: categoria.nome,
        categoria_pai: categoria.categoria_pai ?? null,
      }));
      const fetchedFornecedores: Fornecedor[] = fornecedoresRes.data.results || [];

      setCategorias(fetchedCategorias);
      setFornecedores(fetchedFornecedores.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }, []);

  const categoryOptions = useMemo(() => {
    if (!categorias.length) {
      return [] as CategoriaOption[];
    }

    const byParent = new Map<number | null, Categoria[]>();

    categorias.forEach((categoria) => {
      const parentId = categoria.categoria_pai ?? null;
      if (!byParent.has(parentId)) {
        byParent.set(parentId, []);
      }
      byParent.get(parentId)!.push(categoria);
    });

    const sortByName = (items: Categoria[]) =>
      items
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

    const result: CategoriaOption[] = [];

    const walk = (parentId: number | null, prefix: string) => {
      const siblings = byParent.get(parentId);
      if (!siblings) {
        return;
      }

      sortByName(siblings).forEach((categoria) => {
        const displayName = prefix ? `${prefix} › ${categoria.nome}` : categoria.nome;
        result.push({ ...categoria, displayName });
        walk(categoria.id, prefix ? `${prefix} › ${categoria.nome}` : categoria.nome);
      });
    };

    walk(null, "");

    // Guarantee that orphaned categories (without a valid parent) are still listed
    const knownIds = new Set(result.map((item) => item.id));
    categorias
      .filter((categoria) => !knownIds.has(categoria.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
      .forEach((categoria) => {
        result.push({ ...categoria, displayName: categoria.nome });
      });

    return result;
  }, [categorias]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        ...formData,
        categoria: parseInt(formData.categoria, 10),
        fornecedor: parseInt(formData.fornecedor, 10),
        preco_custo: parseFloat(formData.preco_custo),
        preco_venda: parseFloat(formData.preco_venda),
        estoque_minimo: parseInt(formData.estoque_minimo, 10),
        dias_alerta_vencimento: parseInt(formData.dias_alerta_vencimento, 10),
      };

      // Se está criando com entrada de estoque, incluir dados do lote na criação
      if (createWithEntry && loteData.numero_lote && loteData.quantidade > 0) {
        productData.lote_inicial = {
          numero_lote: loteData.numero_lote,
          data_vencimento: loteData.data_vencimento || null,
          quantidade: loteData.quantidade,
          custo_unitario: loteData.custo_unitario || parseFloat(formData.preco_custo),
        };
      }

      const productResponse = await api.post("/catalog/produtos/", productData);

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Erro ao salvar produto:", error);
      const message = error?.response?.data?.message || error?.message || "Erro ao salvar produto";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
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
    setLoteData({
      numero_lote: "",
      data_vencimento: "",
      quantidade: 0,
      custo_unitario: 0,
    });
    setCreateWithEntry(mode === 'entry');
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">
            {mode === 'entry' ? 'Novo Produto com Entrada de Estoque' : 'Novo Produto'}
          </h2>

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
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Categoria
              </label>
              <select
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.categoria}
                onChange={(e) => handleChange("categoria", e.target.value)}
              >
                <option value="">Selecione uma categoria</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </option>
                ))}
              </select>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {!categorias.length ? "Nenhuma categoria cadastrada" : ""}
                </span>
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:underline"
                  onClick={() => setShowCategoryModal(true)}
                >
                  + Nova categoria
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fornecedor
              </label>
              <select
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
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
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {!fornecedores.length ? "Nenhum fornecedor cadastrado" : ""}
                </span>
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:underline"
                  onClick={() => setShowSupplierModal(true)}
                >
                  + Novo fornecedor
                </button>
              </div>
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

          {/* Opção para criar com entrada de estoque */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="create_with_entry"
                checked={createWithEntry}
                onChange={(e) => setCreateWithEntry(e.target.checked)}
              />
              <label htmlFor="create_with_entry" className="text-sm font-medium">
                Criar produto com entrada inicial de estoque
              </label>
            </div>

            {createWithEntry && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700">Informações do Lote</h3>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Número do Lote"
                    required={createWithEntry}
                    value={loteData.numero_lote}
                    onChange={(e) => setLoteData(prev => ({ ...prev, numero_lote: e.target.value }))}
                    placeholder="Ex: LT001, 2024001, etc."
                  />
                  <Input
                    label="Quantidade"
                    type="number"
                    min="1"
                    required={createWithEntry}
                    value={loteData.quantidade}
                    onChange={(e) => setLoteData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Data de Vencimento (opcional)"
                    type="date"
                    value={loteData.data_vencimento}
                    onChange={(e) => setLoteData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                  />
                  <Input
                    label="Custo Unitário (opcional)"
                    type="number"
                    step="0.01"
                    value={loteData.custo_unitario}
                    onChange={(e) => setLoteData(prev => ({ ...prev, custo_unitario: parseFloat(e.target.value) || 0 }))}
                    placeholder="Deixe vazio para usar o preço de custo"
                  />
                </div>

                <div className="text-xs text-gray-600">
                  <p>• O número do lote deve ser único para este produto</p>
                  <p>• Se não informar custo unitário, será usado o preço de custo do produto</p>
                  <p>• A movimentação de entrada será registrada automaticamente</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => { resetForm(); onClose(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
      </div>

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSuccess={(categoria) => {
          if (!categoria) {
            return;
          }

          setCategorias((prev) => {
            const normalized: Categoria = {
              id: categoria.id,
              nome: categoria.nome,
              categoria_pai: categoria.categoria_pai ?? null,
            };

            const alreadyExists = prev.some((item) => item.id === normalized.id);
            return alreadyExists
              ? prev.map((item) => (item.id === normalized.id ? normalized : item))
              : [...prev, normalized];
          });
          setFormData((prev) => ({ ...prev, categoria: String(categoria.id) }));
          setShowCategoryModal(false);
        }}
      />

      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={(fornecedor) => {
          if (!fornecedor) {
            return;
          }

          setFornecedores((prev) =>
            [...prev, fornecedor].sort((a, b) => a.nome.localeCompare(b.nome))
          );
          setFormData((prev) => ({ ...prev, fornecedor: String(fornecedor.id) }));
          setShowSupplierModal(false);
        }}
      />
    </>
  );
};
