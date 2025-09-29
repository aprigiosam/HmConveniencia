import React, { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import api from "../services/api";
import { toast } from "react-toastify";

type Categoria = {
  id: number;
  nome: string;
  descricao?: string;
  categoria_pai?: number | null;
};

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (categoria: Categoria) => void;
};

const emptyForm = {
  nome: "",
  descricao: "",
};

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.nome.trim()) {
      setError("Informe o nome da categoria");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post<Categoria>("/catalog/categorias/", {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
      });

      setForm(emptyForm);
      setError(null);
      const message = error?.message ?? "Erro ao criar categoria";
      toast.error(message);
      const message = error?.message ?? "Erro ao criar categoria";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setForm(emptyForm);
    onClose();
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="border-b px-6 py-4">
          <h2 id="category-modal-title" className="text-lg font-semibold">Nova categoria</h2>
          <p className="text-xs text-slate-500">Cadastre categorias para organizar o catálogo de produtos.</p>
        </div>
          <h2 className="text-lg font-semibold">Nova categoria</h2>
          <p className="text-xs text-slate-500">Cadastre categorias para organizar o catálogo de produtos.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {error && (
            <div className="mb-2 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}
          <Input
            label="Nome"
            required
            value={form.nome}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, nome: event.target.value }));
              if (error) setError(null);
            }}
          />

          <Input
            label="Descrição (opcional)"
            value={form.descricao}
            onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
// export default CategoryModal; // Removed to avoid confusion with named export

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeAndReset} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar categoria"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
