import { useEffect, useState } from "react";
import api from "../services/api";
import { Badge } from "./ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";

type ProdutoDetalhe = {
  id: number;
  sku: string;
  codigo_barras: string;
  nome: string;
  descricao: string;
  categoria_nome: string;
  fornecedor_nome: string;
  unidade: string;
  preco_custo: string;
  preco_venda: string;
  estoque_minimo: number;
  controla_vencimento: boolean;
  dias_alerta_vencimento: number;
  permite_venda_vencido: boolean;
  desconto_produto_vencido: string;
  ativo: boolean;
  margem_lucro: number;
  estoque_total: number;
};

type Lote = {
  id: number;
  numero_lote: string;
  data_vencimento: string | null;
  quantidade: number;
  custo_unitario: string;
  loja_nome: string;
  status_vencimento: string;
  dias_vencimento: number | null;
  pode_vender: boolean;
};

type ProductDetailModalProps = {
  productId: number | null;
  isOpen: boolean;
  onClose: () => void;
};

const statusBadge = (status: string) => {
  switch (status) {
    case "VENCIDO":
      return <Badge tone="danger">Vencido</Badge>;
    case "PROXIMO_VENCIMENTO":
      return <Badge tone="warning">Prox. venc.</Badge>;
    case "OK":
      return <Badge tone="success">OK</Badge>;
    default:
      return <Badge tone="secondary">Sem controle</Badge>;
  }
};

const formatCurrency = (value: number | string) => {
  const numeric = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(numeric)) return "-";
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDate = (value: string | null) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("pt-BR");
};

export const ProductDetailModal = ({ productId, isOpen, onClose }: ProductDetailModalProps) => {
  const [loading, setLoading] = useState(false);
  const [produto, setProduto] = useState<ProdutoDetalhe | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !productId) {
      setProduto(null);
      setLotes([]);
      setErrorMessage(null);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    const loadData = async () => {
      try {
        const [produtoRes, lotesRes] = await Promise.all([
          api.get(`/catalog/produtos/${productId}/`),
          api.get("/inventory/lotes/", { params: { produto: productId } }),
        ]);

        if (!active) {
          return;
        }

        setProduto(produtoRes.data);
        setLotes(lotesRes.data.results ?? lotesRes.data ?? []);
      } catch (error: any) {
        if (!active) {
          return;
        }
        const message = error?.message ?? "Erro ao carregar detalhes do produto";
        setErrorMessage(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [isOpen, productId]);

  if (!isOpen || !productId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Detalhes do produto</h2>
          <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Carregando...</p>}
        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {produto && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-slate-500">SKU</p>
                <p className="font-mono text-sm text-slate-700">{produto.sku}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Código de barras</p>
                <p className="font-mono text-sm text-slate-700">{produto.codigo_barras}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Status</p>
                <Badge tone={produto.ativo ? "success" : "danger"}>{produto.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Categoria</p>
                <p className="text-sm text-slate-700">{produto.categoria_nome}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Fornecedor</p>
                <p className="text-sm text-slate-700">{produto.fornecedor_nome}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Unidade</p>
                <p className="text-sm text-slate-700">{produto.unidade}</p>
              </div>
            </div>

            {produto.descricao && (
              <div>
                <p className="text-xs uppercase text-slate-500">Descrição</p>
                <p className="text-sm text-slate-700">{produto.descricao}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Preço de custo</p>
                <p className="text-sm text-slate-700">{formatCurrency(produto.preco_custo)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Preço de venda</p>
                <p className="text-sm text-slate-700">{formatCurrency(produto.preco_venda)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Margem</p>
                <p className="text-sm text-slate-700">{produto.margem_lucro}%</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Estoque mínimo</p>
                <p className="text-sm text-slate-700">{produto.estoque_minimo}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Estoque total</p>
                <p className="text-sm text-slate-700">{produto.estoque_total}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Controle de vencimento</p>
                <p className="text-sm text-slate-700">
                  {produto.controla_vencimento ? `Sim (${produto.dias_alerta_vencimento} dias de alerta)` : "Não"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">Lotes cadastrados</h3>
              {lotes.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum lote cadastrado para este produto.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loja</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Custo unit.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell>{lote.loja_nome}</TableCell>
                        <TableCell>{lote.numero_lote}</TableCell>
                        <TableCell>{formatDate(lote.data_vencimento)}</TableCell>
                        <TableCell>{lote.quantidade}</TableCell>
                        <TableCell>{formatCurrency(lote.custo_unitario)}</TableCell>
                        <TableCell>{statusBadge(lote.status_vencimento)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

