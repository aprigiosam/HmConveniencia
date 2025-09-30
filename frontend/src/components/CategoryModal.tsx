import React, { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import api from "../services/api";
import { toast } from "react-hot-toast";

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
      onSuccess(data);
      onClose();
      toast.success("Categoria criada com sucesso!");
    } catch (err) {
      console.error("Erro ao criar categoria:", err);
      setError("Erro ao criar categoria. Tente novamente.");
      toast.error("Erro ao criar categoria");
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setForm(emptyForm);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">Nova Categoria</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da categoria *"
            value={form.nome}
            onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
            disabled={loading}
            autoFocus
          />

          <Input
            label="Descrição (opcional)"
            value={form.descricao}
            onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
            disabled={loading}
          />

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