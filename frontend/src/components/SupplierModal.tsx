import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { Supplier, SupplierContact } from "../services/suppliers";
import { createSupplier, updateSupplier } from "../services/suppliers";

const emptyContact: SupplierContact = {
  nome: "",
  telefone: "",
  email: "",
  observacao: "",
};

type SupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
};

type EnderecoForm = {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  complemento: string;
};

const emptyEndereco: EnderecoForm = {
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  complemento: "",
};

const normalizeEndereco = (value?: Record<string, unknown> | null): EnderecoForm => ({
  logradouro: String(value?.["logradouro"] ?? ""),
  numero: String(value?.["numero"] ?? ""),
  bairro: String(value?.["bairro"] ?? ""),
  cidade: String(value?.["cidade"] ?? ""),
  uf: String(value?.["uf"] ?? ""),
  cep: String(value?.["cep"] ?? ""),
  complemento: String(value?.["complemento"] ?? ""),
});

export const SupplierModal = ({ isOpen, onClose, onSuccess, supplier }: SupplierModalProps) => {
  const [loading, setLoading] = useState(false);
  const [contatos, setContatos] = useState<SupplierContact[]>([emptyContact]);
  const [endereco, setEndereco] = useState<EnderecoForm>(emptyEndereco);
  const [formState, setFormState] = useState({
    nome: "",
    cnpj_cpf: "",
    telefone: "",
    email: "",
    responsavel: "",
    condicoes_pagamento: "",
    prazo_medio_entrega_dias: "0",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormState({
          nome: supplier.nome ?? "",
          cnpj_cpf: supplier.cnpj_cpf ?? "",
          telefone: supplier.telefone ?? "",
          email: supplier.email ?? "",
          responsavel: supplier.responsavel ?? "",
          condicoes_pagamento: supplier.condicoes_pagamento ?? "",
          prazo_medio_entrega_dias: String(supplier.prazo_medio_entrega_dias ?? 0),
          observacoes: supplier.observacoes ?? "",
          ativo: supplier.ativo,
        });
        setContatos(supplier.contatos?.length ? supplier.contatos : [emptyContact]);
        setEndereco(normalizeEndereco(supplier.endereco ?? null));
      } else {
        setFormState({
          nome: "",
          cnpj_cpf: "",
          telefone: "",
          email: "",
          responsavel: "",
          condicoes_pagamento: "",
          prazo_medio_entrega_dias: "0",
          observacoes: "",
          ativo: true,
        });
        setContatos([emptyContact]);
        setEndereco(emptyEndereco);
      }
    }
  }, [isOpen, supplier]);

  const titulo = useMemo(() => (supplier ? "Editar fornecedor" : "Novo fornecedor"), [supplier]);

  const handleContatoChange = (index: number, field: keyof SupplierContact, value: string) => {
    setContatos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddContato = () => {
    setContatos((prev) => [...prev, { ...emptyContact }]);
  };

  const handleRemoveContato = (index: number) => {
    setContatos((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const handleEnderecoChange = (field: keyof EnderecoForm, value: string) => {
    setEndereco((prev) => ({ ...prev, [field]: value }));
  };

  const handleChange = (field: keyof typeof formState, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const enderecoPayload = Object.fromEntries(
        Object.entries(endereco).filter(([, value]) => (value ?? "").toString().trim() !== ""),
      );

      const payload = {
        ...formState,
        prazo_medio_entrega_dias: parseInt(formState.prazo_medio_entrega_dias || "0", 10),
        contatos: contatos
          .map((contato) => ({
            nome: contato.nome?.trim() ?? "",
            telefone: contato.telefone?.trim() ?? "",
            email: contato.email?.trim() ?? "",
            observacao: contato.observacao?.trim() ?? "",
          }))
          .filter((contato) => contato.nome || contato.telefone || contato.email || contato.observacao),
        endereco: enderecoPayload,
      };

      if (supplier) {
        await updateSupplier(supplier.id, payload);
        toast.success("Fornecedor atualizado com sucesso");
      } else {
        await createSupplier(payload);
        toast.success("Fornecedor criado com sucesso");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const message = error?.message ?? "Não foi possível salvar o fornecedor";
      toast.error(message);
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
          <h2 className="text-xl font-semibold text-slate-800">{titulo}</h2>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome do fornecedor"
              required
              value={formState.nome}
              onChange={(event) => handleChange("nome", event.target.value)}
            />
            <Input
              label="CNPJ/CPF"
              required
              value={formState.cnpj_cpf}
              onChange={(event) => handleChange("cnpj_cpf", event.target.value)}
            />
            <Input
              label="Telefone"
              value={formState.telefone}
              onChange={(event) => handleChange("telefone", event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={formState.email}
              onChange={(event) => handleChange("email", event.target.value)}
            />
            <Input
              label="Responsável"
              value={formState.responsavel}
              onChange={(event) => handleChange("responsavel", event.target.value)}
            />
            <Input
              label="Prazo médio de entrega (dias)"
              type="number"
              min="0"
              value={formState.prazo_medio_entrega_dias}
              onChange={(event) => handleChange("prazo_medio_entrega_dias", event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Condições de pagamento</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
              value={formState.condicoes_pagamento}
              onChange={(event) => handleChange("condicoes_pagamento", event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
              value={formState.observacoes}
              onChange={(event) => handleChange("observacoes", event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Contatos</h3>
              <Button type="button" variant="secondary" onClick={handleAddContato}>
                Adicionar contato
              </Button>
            </div>
            <div className="space-y-4">
              {contatos.map((contato, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-4">
                  <Input
                    label="Nome"
                    value={contato.nome ?? ""}
                    onChange={(event) => handleContatoChange(index, "nome", event.target.value)}
                  />
                  <Input
                    label="Telefone"
                    value={contato.telefone ?? ""}
                    onChange={(event) => handleContatoChange(index, "telefone", event.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={contato.email ?? ""}
                    onChange={(event) => handleContatoChange(index, "email", event.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Observação</label>
                    <textarea
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      rows={1}
                      value={contato.observacao ?? ""}
                      onChange={(event) => handleContatoChange(index, "observacao", event.target.value)}
                    />
                    {contatos.length > 1 ? (
                      <button
                        type="button"
                        className="self-end text-xs text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveContato(index)}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Endereço</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Logradouro"
                value={endereco.logradouro}
                onChange={(event) => handleEnderecoChange("logradouro", event.target.value)}
              />
              <Input
                label="Número"
                value={endereco.numero}
                onChange={(event) => handleEnderecoChange("numero", event.target.value)}
              />
              <Input
                label="Bairro"
                value={endereco.bairro}
                onChange={(event) => handleEnderecoChange("bairro", event.target.value)}
              />
              <Input
                label="Cidade"
                value={endereco.cidade}
                onChange={(event) => handleEnderecoChange("cidade", event.target.value)}
              />
              <Input
                label="UF"
                value={endereco.uf}
                onChange={(event) => handleEnderecoChange("uf", event.target.value)}
              />
              <Input
                label="CEP"
                value={endereco.cep}
                onChange={(event) => handleEnderecoChange("cep", event.target.value)}
              />
              <Input
                label="Complemento"
                value={endereco.complemento}
                onChange={(event) => handleEnderecoChange("complemento", event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="fornecedor-ativo"
              type="checkbox"
              checked={formState.ativo}
              onChange={(event) => handleChange("ativo", event.target.checked)}
            />
            <label htmlFor="fornecedor-ativo" className="text-sm text-slate-600">
              Fornecedor ativo
            </label>
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
