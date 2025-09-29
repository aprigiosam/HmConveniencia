import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { SupplierModal } from "../components/SupplierModal";
import type { Supplier } from "../services/suppliers";
import {
  fetchSupplierProducts,
  fetchSuppliers,
  toggleSupplierStatus,
} from "../services/suppliers";

const formatCurrency = (value: string | number) => {
  const numero = Number(value ?? 0);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

type SupplierProduct = {
  id: number;
  sku: string;
  nome: string;
  estoque_total: number;
  categoria_nome: string;
  preco_venda: string;
};

type StatusFilter = "all" | "active" | "inactive";

export const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [productsBySupplier, setProductsBySupplier] = useState<Record<number, SupplierProduct[]>>({});

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);
        const data = await fetchSuppliers({
          search: search || undefined,
          ativo: statusFilter === "all" ? undefined : statusFilter === "active",
        });
        setSuppliers(data?.results ?? []);
        if (data?.results?.length && !selectedSupplier) {
          setSelectedSupplier(data.results[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar fornecedores", error);
        toast.error("Não foi possível carregar os fornecedores");
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuppliers();
  }, [statusFilter, selectedSupplier]);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);
        const data = await fetchSuppliers({
          search: search || undefined,
          ativo: statusFilter === "all" ? undefined : statusFilter === "active",
        });
        setSuppliers(data?.results ?? []);
        if (data?.results?.length && !selectedSupplier) {
          setSelectedSupplier(data.results[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar fornecedores", error);
        toast.error("Não foi possível carregar os fornecedores");
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      loadSuppliers();
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await fetchSuppliers({
        search: search || undefined,
        ativo: statusFilter === "all" ? undefined : statusFilter === "active",
      });
      setSuppliers(data?.results ?? []);
      if (data?.results?.length && !selectedSupplier) {
        setSelectedSupplier(data.results[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar fornecedores", error);
      toast.error("Não foi possível carregar os fornecedores");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedSupplier) return;
      if (productsBySupplier[selectedSupplier.id]) return;
      try {
        const data = await fetchSupplierProducts(selectedSupplier.id);
        setProductsBySupplier((prev) => ({ ...prev, [selectedSupplier.id]: data ?? [] }));
      } catch (error) {
        console.warn("Falha ao carregar produtos do fornecedor", error);
      }
    };
    loadProducts();
  }, [productsBySupplier, selectedSupplier]);

  const resumo = useMemo(() => {
    const total = suppliers.length;
    const ativos = suppliers.filter((Fornecedor) => Fornecedor.ativo).length;
    const inativos = total - ativos;
    const valorEstoqueTotal = suppliers.reduce((acc, item) => acc + Number(item.valor_estoque ?? 0), 0);
    const estoqueTotal = suppliers.reduce((acc, item) => acc + Number(item.estoque_total ?? 0), 0);

    return {
      total,
      ativos,
      inativos,
      valorEstoqueTotal,
      estoqueTotal,
    };
  }, [suppliers]);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowModal(true);
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      const updated = await toggleSupplierStatus(supplier.id, !supplier.ativo);
      setSuppliers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedSupplier?.id === updated.id) {
        setSelectedSupplier(updated);
      }
      toast.success(`Fornecedor ${updated.ativo ? "ativado" : "desativado"}`);
    } catch (error) {
      console.error("Falha ao alterar status", error);
      toast.error("Não foi possível alterar o status do fornecedor");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSupplier(null);
  };

  const currentProducts = selectedSupplier ? productsBySupplier[selectedSupplier.id] ?? [] : [];

  return (
    <div className="space-y-6">
      <Card
        title="Fornecedores"
        action={
          <Button
            onClick={() => {
              setEditingSupplier(null);
              setShowModal(true);
            }}
          >
            Novo fornecedor
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Buscar"
            placeholder="Nome ou CNPJ"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">
            {loading ? "Atualizando fornecedores..." : `${resumo.total} fornecedores`}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-slate-400">Ativos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{resumo.ativos}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-400">Inativos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{resumo.inativos}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-400">Itens em estoque</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{resumo.estoqueTotal}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-400">Valor em estoque</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{formatCurrency(resumo.valorEstoqueTotal)}</p>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Produtos ativos</TableHead>
              <TableHead>Estoque total</TableHead>
              <TableHead>Valor em estoque</TableHead>
              <TableHead>Prazo médio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplierItem) => (
              <TableRow
                key={supplierItem.id}
                onClick={() => setSelectedSupplier(supplierItem)}
                className="cursor-pointer"
              >
                <TableCell>{supplierItem.nome}</TableCell>
                <TableCell>{supplierItem.cnpj_cpf}</TableCell>
                <TableCell>{supplierItem.produtos_ativos}</TableCell>
                <TableCell>{supplierItem.estoque_total}</TableCell>
                <TableCell>{formatCurrency(supplierItem.valor_estoque)}</TableCell>
                <TableCell>
                  {supplierItem.prazo_medio_entrega_dias}
                  {" "}
                  dias
                </TableCell>
                <TableCell>
                  <Badge tone={supplierItem.ativo ? "success" : "danger"}>
                    {supplierItem.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEdit(supplierItem);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleStatus(supplierItem);
                    }}
                  >
                    {supplierItem.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!suppliers.length && !loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-slate-500">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      {selectedSupplier ? (
        <Card title="Detalhes do fornecedor">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <h3 className="text-base font-semibold text-slate-800">Informações principais</h3>
              <p><strong>Nome:</strong> {selectedSupplier.nome}</p>
              <p><strong>CNPJ/CPF:</strong> {selectedSupplier.cnpj_cpf}</p>
              {selectedSupplier.responsavel ? <p><strong>Responsável:</strong> {selectedSupplier.responsavel}</p> : null}
              {selectedSupplier.telefone ? <p><strong>Telefone:</strong> {selectedSupplier.telefone}</p> : null}
              {selectedSupplier.email ? <p><strong>Email:</strong> {selectedSupplier.email}</p> : null}
              <p><strong>Prazo médio:</strong> {selectedSupplier.prazo_medio_entrega_dias} dias</p>
              {selectedSupplier.condicoes_pagamento ? (
                <p><strong>Condições:</strong> {selectedSupplier.condicoes_pagamento}</p>
              ) : null}
              {selectedSupplier.observacoes ? (
                <p><strong>Observações:</strong> {selectedSupplier.observacoes}</p>
              ) : null}
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="text-base font-semibold text-slate-800">Contatos</h3>
              {selectedSupplier.contatos?.length ? (
                <ul className="space-y-1">
                  {selectedSupplier.contatos.map((contato, index) => (
                    <li key={index} className="rounded border border-slate-200 p-2">
                      {contato.nome ? <div className="font-semibold text-slate-700">{contato.nome}</div> : null}
                      {contato.telefone ? <div>📞 {contato.telefone}</div> : null}
                      {contato.email ? <div>✉️ {contato.email}</div> : null}
                      {contato.observacao ? <div className="text-xs text-slate-500">{contato.observacao}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Nenhum contato adicional cadastrado.</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-slate-800">Produtos fornecidos</h3>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts?.length ? (
                  currentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-xs text-slate-500">{product.sku}</TableCell>
                      <TableCell>{product.nome}</TableCell>
                      <TableCell>{product.categoria_nome}</TableCell>
                      <TableCell>{product.estoque_total}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                      Nenhum produto vinculado ou dados não carregados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}

      <SupplierModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={loadSuppliers}
        supplier={editingSupplier}
      />
    </div>
  );
};
