import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import toast from "react-hot-toast";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { NfeConfigModal } from "../components/NfeConfigModal";
import type { NfeConfig, NfeNota } from "../services/nfe";
import { emitirNota, listNfeConfigs, listNotas } from "../services/nfe";

const statusTone: Record<string, "success" | "warning" | "danger" | "info"> = {
  AUTORIZADA: "success",
  PROCESSANDO: "warning",
  RASCUNHO: "info",
  REJEITADA: "danger",
  CANCELADA: "danger",
};

export const NFePage = () => {
  const [configs, setConfigs] = useState<NfeConfig[]>([]);
  const [notas, setNotas] = useState<NfeNota[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<NfeConfig | null>(null);
  const [loadingNotas, setLoadingNotas] = useState(false);

  const loadConfigs = async () => {
    try {
      const data = await listNfeConfigs();
      setConfigs(data.results ?? []);
    } catch (error) {
      toast.error("Falha ao carregar configurações de NF-e");
      setConfigs([]);
    }
  };

  const loadNotas = async () => {
    try {
      setLoadingNotas(true);
      const data = await listNotas();
      setNotas(data.results ?? []);
    } catch (error) {
      toast.error("Não foi possível carregar as notas fiscais");
      setNotas([]);
    } finally {
      setLoadingNotas(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    loadNotas();
  }, []);

  const configPrincipal = useMemo(() => configs[0], [configs]);

  const handleEmitirMock = async () => {
    if (!configPrincipal) {
      toast.error("Cadastre a configuração NF-e da loja primeiro");
      return;
    }

    const vendaId = Number(prompt("Informe o ID da venda para gerar NF-e:"));
    if (!vendaId) {
      return;
    }

    try {
      await emitirNota({ venda_id: vendaId, loja_id: configPrincipal.loja });
      toast.success("NF-e gerada em modo simulado");
      loadNotas();
    } catch (error: any) {
      toast.error(error?.message ?? "Erro ao emitir NF-e");
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Configuração do emitente"
        action={
          <Button
            onClick={() => {
              setEditingConfig(configPrincipal ?? null);
              setShowModal(true);
            }}
          >
            {configPrincipal ? "Editar" : "Nova configuração"}
          </Button>
        }
      >
        {configPrincipal ? (
          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-700">
            <div>
              <p className="font-medium text-slate-900">Loja</p>
              <p>{configPrincipal.loja_nome}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Ambiente</p>
              <p>{configPrincipal.ambiente === "PROD" ? "Produção" : "Homologação"}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Série</p>
              <p>{configPrincipal.serie}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Próximo número</p>
              <p>{configPrincipal.proximo_numero}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Inscrição Estadual</p>
              <p>{configPrincipal.inscricao_estadual || "-"}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Certificado</p>
              <p>{configPrincipal.certificado_nome || "Não informado"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Nenhuma configuração cadastrada. Informe os dados fiscais da loja para emitir NF-e em São Paulo.
          </p>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Notas fiscais</h2>
        <Button onClick={handleEmitirMock} variant="secondary">
          Emitir NF-e (simulação)
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Série/Número</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Autorização</TableHead>
              <TableHead>Ambiente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingNotas ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                  Carregando notas...
                </TableCell>
              </TableRow>
            ) : notas.length ? (
              notas.map((nota) => (
                <TableRow key={nota.id}>
                  <TableCell>
                    {nota.serie}/{nota.numero}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{nota.chave_acesso}</TableCell>
                  <TableCell>
                    <Badge tone={statusTone[nota.status] ?? "info"}>{nota.status}</Badge>
                  </TableCell>
                  <TableCell>{nota.total_notafiscal}</TableCell>
                  <TableCell>
                    {nota.dh_autorizacao
                      ? format(new Date(nota.dh_autorizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell>{nota.ambiente === "PROD" ? "Produção" : "Homologação"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                  Nenhuma NF-e emitida ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <NfeConfigModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        config={editingConfig}
        onSuccess={(config) => {
          setConfigs((prev) => {
            const existing = prev.find((item) => item.id === config.id);
            if (existing) {
              return prev.map((item) => (item.id === config.id ? config : item));
            }
            return [config, ...prev];
          });
        }}
      />
    </div>
  );
};
