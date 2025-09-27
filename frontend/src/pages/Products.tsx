import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import api from "../services/api";

type Produto = {
  id: number;
  sku: string;
  nome: string;
  categoria: string;
  estoque: number;
  preco_venda: number;
  margem: number;
  ativo: boolean;
};

const fallback: Produto[] = [
  { id: 1, sku: "COCA001", nome: "Coca-Cola 350ml", categoria: "Bebidas", estoque: 120, preco_venda: 4.5, margem: 28, ativo: true },
  { id: 2, sku: "BALA010", nome: "Bala de menta 100g", categoria: "Conveniência", estoque: 75, preco_venda: 2.5, margem: 35, ativo: true },
  { id: 3, sku: "LIMP01", nome: "Detergente neutro 500ml", categoria: "Limpeza", estoque: 20, preco_venda: 3.2, margem: 22, ativo: false },
];

export const ProductsPage = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/catalog/produtos", { params: { search } });
        setProdutos(data?.results ?? fallback);
      } catch (error) {
        console.warn("Falha ao carregar produtos", error);
        setProdutos(fallback);
      }
    };
    load();
  }, [search]);

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
          <Button onClick={() => alert("Fluxo de cadastro em desenvolvimento")}>Novo produto</Button>
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
              <TableHead>Estoque</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Margem</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell className="font-mono text-xs uppercase text-slate-500">{produto.sku}</TableCell>
                <TableCell>{produto.nome}</TableCell>
                <TableCell>{produto.categoria}</TableCell>
                <TableCell>{produto.estoque}</TableCell>
                <TableCell>{produto.preco_venda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                <TableCell>
                  <Badge tone={produto.margem > 25 ? "success" : "warning"}>{produto.margem}%</Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={produto.ativo ? "success" : "danger"}>{produto.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
