import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { Client, ClientAddress, ClientPayload } from "../services/clients";

const emptyAddress: ClientAddress = {
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  complemento: "",
};

type ClientFormValues = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  pontos_fidelidade: string;
  ativo: boolean;
  endereco: ClientAddress;
};

type ClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: ClientPayload) => Promise<void>;
  client?: Client | null;
};

const normalizeAddress = (value?: ClientAddress | null): ClientAddress => ({
  logradouro: typeof value?.logradouro === "string" ? value.logradouro : "",
  numero: typeof value?.numero === "string" ? value.numero : "",
  bairro: typeof value?.bairro === "string" ? value.bairro : "",
  cidade: typeof value?.cidade === "string" ? value.cidade : "",
  uf: typeof value?.uf === "string" ? value.uf : "",
  cep: typeof value?.cep === "string" ? value.cep : "",
  complemento: typeof value?.complemento === "string" ? value.complemento : "",
});

export const ClientModal = ({ isOpen, onClose, onSubmit, client }: ClientModalProps) => {
  const [form, setForm] = useState<ClientFormValues>({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    pontos_fidelidade: "0",
    ativo: true,
    endereco: { ...emptyAddress },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (client) {
      setForm({
        nome: client.nome ?? "",
        cpf: client.cpf ?? "",
        telefone: client.telefone ?? "",
        email: client.email ?? "",
        pontos_fidelidade: String(client.pontos_fidelidade ?? 0),
        ativo: client.ativo,
        endereco: normalizeAddress(client.endereco),
      });
    } else {
      setForm({
        nome: "",
        cpf: "",
        telefone: "",
        email: "",
        pontos_fidelidade: "0",
        ativo: true,
        endereco: { ...emptyAddress },
      });
    }
  }, [client, isOpen]);

  const handleChange = (field: keyof ClientFormValues, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof ClientAddress, value: string) => {
    setForm((prev) => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const enderecoPayload = Object.fromEntries(
        Object.entries(form.endereco).filter(([, value]) => value && String(value).trim() !== ""),
      );

      await onSubmit({
        nome: form.nome.trim(),
        cpf: form.cpf.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        pontos_fidelidade: Number.parseInt(form.pontos_fidelidade || "0", 10) || 0,
        ativo: form.ativo,
        endereco: Object.keys(enderecoPayload).length ? enderecoPayload : null,
      });
      onClose();
    } catch (error) {
      // onSubmit é responsável por exibir mensagens de erro
      console.debug("Erro ao salvar cliente", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const title = client ? "Editar cliente" : "Novo cliente";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome completo"
              required
              value={form.nome}
              onChange={(event) => handleChange("nome", event.target.value)}
            />
            <Input
              label="CPF"
              required
              value={form.cpf}
              onChange={(event) => handleChange("cpf", event.target.value)}
            />
            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(event) => handleChange("telefone", event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
            />
            <Input
              label="Pontos de fidelidade"
              type="number"
              min="0"
              value={form.pontos_fidelidade}
              onChange={(event) => handleChange("pontos_fidelidade", event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(event) => handleChange("ativo", event.target.checked)}
              />
              Cliente ativo
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">Endereço</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Logradouro"
                value={form.endereco.logradouro as string}
                onChange={(event) => handleAddressChange("logradouro", event.target.value)}
              />
              <Input
                label="Número"
                value={form.endereco.numero as string}
                onChange={(event) => handleAddressChange("numero", event.target.value)}
              />
              <Input
                label="Bairro"
                value={form.endereco.bairro as string}
                onChange={(event) => handleAddressChange("bairro", event.target.value)}
              />
              <Input
                label="Cidade"
                value={form.endereco.cidade as string}
                onChange={(event) => handleAddressChange("cidade", event.target.value)}
              />
              <Input
                label="UF"
                value={form.endereco.uf as string}
                onChange={(event) => handleAddressChange("uf", event.target.value)}
              />
              <Input
                label="CEP"
                value={form.endereco.cep as string}
                onChange={(event) => handleAddressChange("cep", event.target.value)}
              />
              <Input
                label="Complemento"
                value={form.endereco.complemento as string}
                onChange={(event) => handleAddressChange("complemento", event.target.value)}
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
