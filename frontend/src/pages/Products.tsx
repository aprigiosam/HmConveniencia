import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { ProductModal } from "../components/ProductModal";
import api from "../services/api";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";

type Produto = {
  id: number;
  sku: string;
  codigo_barras: string;
  nome: string;
  categoria_nome: string;
  fornecedor_nome: string;
  preco_venda: string;
  estoque_total: number;
  ativo: boolean;
};

const fallback: Produto[] = [];

export const ProductsPage = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const loadProdutos = async () => {
    try {
      const { data } = await api.get("/catalog/produtos/", { params: { search } });
      setProdutos(data?.results ?? fallback);
    } catch (error) {
      console.warn("Falha ao carregar produtos", error);
      setProdutos(fallback);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, [search]);

  useBarcodeScanner({
    onScan: (codigo) => {
      setScannedBarcode(codigo);
      setShowModal(true);
      toast.success(`Código ${codigo} capturado`);
    },
    minLength: 4,
  });

  const filtrados = useMemo(() => {
    if (!search) return produtos;
    return produtos.filter((produto) =>
      produto.nome.toLowerCase().includes(search.toLowerCase()) ||
      produto.sku.toLowerCase().includes(search.toLowerCase()),
    );
  }, [produtos, search]);

  return (
    <div className="space-y-6">
      <Card
        title="Produtos"
        action={
          <Button
            onClick={() => {
              setScannedBarcode(null);
              setShowModal(true);
            }}
          >
            Novo produto
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Buscar"
            placeholder="Nome, SKU ou categoria"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Preco</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell className="font-mono text-xs uppercase text-slate-500">{produto.sku}</TableCell>
                <TableCell>{produto.nome}</TableCell>
                <TableCell>{produto.categoria_nome}</TableCell>
                <TableCell>{produto.fornecedor_nome}</TableCell>
                <TableCell>{produto.estoque_total}</TableCell>
                <TableCell>{parseFloat(produto.preco_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                <TableCell>
                  <Badge tone={produto.ativo ? "success" : "danger"}>{produto.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ProductModal
        isOpen={showModal}
        initialBarcode={scannedBarcode ?? undefined}
        onClose={() => {
          setShowModal(false);
          setScannedBarcode(null);
        }}
        onSuccess={loadProdutos}
      />
    </div>
  );
};
