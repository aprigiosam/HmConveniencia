import React, { useEffect, useMemo, useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import api from "../services/api";
import type { Supplier } from "../services/suppliers";

type Fornecedor = {
  id: number;
  nome: string;
  cnpj_cpf: string;
  telefone?: string;
  email?: string;
};

type SupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (fornecedor?: Fornecedor) => void | Promise<void>;
  supplier?: Supplier | null;
};

const emptyForm = {
  nome: "",
  cnpj_cpf: "",
  telefone: "",
  email: "",
};

export const SupplierModal: React.FC<SupplierModalProps> = ({ isOpen, onClose, onSuccess, supplier }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isEditMode = useMemo(() => Boolean(supplier?.id), [supplier]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (supplier) {
      setForm({
        nome: supplier.nome ?? "",
        cnpj_cpf: supplier.cnpj_cpf ?? "",
        telefone: supplier.telefone ?? "",
        email: supplier.email ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, supplier]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.nome.trim()) {
      alert("Informe o nome do fornecedor");
      return;
    }

    if (!form.cnpj_cpf.trim()) {
      alert("Informe o CNPJ ou CPF do fornecedor");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        cnpj_cpf: form.cnpj_cpf.trim(),
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
      };
      const endpoint = supplier?.id
        ? api.patch<Supplier>(`/catalog/fornecedores/${supplier.id}/`, payload)
        : api.post<Supplier>("/catalog/fornecedores/", payload);

      const { data } = await endpoint;
      const lightweight: Fornecedor = {
        id: data.id,
        nome: data.nome,
        cnpj_cpf: data.cnpj_cpf,
        telefone: data.telefone,
        email: data.email,
      };

      setForm(emptyForm);
      await onSuccess?.(lightweight);
      closeAndReset();
    } catch (error: any) {
      const message = error?.message ?? "Erro ao salvar fornecedor";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setForm(emptyForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{isEditMode ? "Editar fornecedor" : "Novo fornecedor"}</h2>
          <p className="text-xs text-slate-500">
            {isEditMode
              ? "Atualize as informações do fornecedor selecionado."
              : "Cadastre o fornecedor para vincular aos produtos."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <Input
            label="Nome"
            required
            value={form.nome}
            onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
          />

          <Input
            label="CNPJ/CPF"
            required
            value={form.cnpj_cpf}
            onChange={(event) => setForm((prev) => ({ ...prev, cnpj_cpf: event.target.value }))}
          />

          <Input
            label="Telefone (opcional)"
            value={form.telefone}
            onChange={(event) => setForm((prev) => ({ ...prev, telefone: event.target.value }))}
          />

          <Input
            label="E-mail (opcional)"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeAndReset} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditMode ? "Atualizar fornecedor" : "Salvar fornecedor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;
