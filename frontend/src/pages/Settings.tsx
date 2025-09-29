import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

export const SettingsPage = () => {
  const [multiLoja, setMultiLoja] = useState(() => import.meta.env.VITE_ENABLE_MULTI_STORE === "true");
  const [loja, setLoja] = useState({ nome: "Loja Centro", telefone: "(11) 99999-9999", endereco: "Rua Principal, 123" });

  const salvar = () => {
    toast.success("Configurações salvas (mock)");
  };

  return (
    <div className="space-y-6">
      <Card title="Loja">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nome"
            value={loja.nome}
            onChange={(event) => setLoja((prev) => ({ ...prev, nome: event.target.value }))}
          />
          <Input
            label="Telefone"
            value={loja.telefone}
            onChange={(event) => setLoja((prev) => ({ ...prev, telefone: event.target.value }))}
          />
          <Input
            className="md:col-span-2"
            label="Endereço"
            value={loja.endereco}
            onChange={(event) => setLoja((prev) => ({ ...prev, endereco: event.target.value }))}
          />
        </div>
      </Card>

      <Card title="Recursos">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={multiLoja} onChange={(event) => setMultiLoja(event.target.checked)} />
          Ativar modo multi-loja
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Com multi-loja ativo, cadastre estoques independentes e acompanhe relatórios consolidados.
        </p>
      </Card>

      <Button onClick={salvar}>Salvar alterações</Button>
    </div>
  );
};
