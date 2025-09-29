import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CircleSlash,
  DollarSign,
  Loader2,
  Search,
  Star,
  Users,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { ClientModal } from "../components/ClientModal";
import type { Client, ClientPayload } from "../services/clients";
import { createClient, fetchClients, toggleClientStatus, updateClient } from "../services/clients";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }
  try {
    return format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (error) {
    return value;
  }
};

type StatusFilter = "all" | "active" | "inactive";

export const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalClient, setModalClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const results = await fetchClients({
        search: debouncedSearch || undefined,
        ativo: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
      });
      setClients(results);
      if (results.length && !selectedClient) {
        setSelectedClient(results[0]);
      }
      if (!results.length) {
        setSelectedClient(null);
      }
    } catch (error: any) {
      const message = error?.message ?? "Não foi possível carregar os clientes";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  const handleOpenCreate = () => {
    setModalClient(null);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setModalClient(client);
    setIsModalOpen(true);
  };

  const handleSubmitClient = async (payload: ClientPayload) => {
    try {
      if (modalClient) {
        await updateClient(modalClient.id, payload);
        toast.success("Cliente atualizado com sucesso");
      } else {
        await createClient(payload);
        toast.success("Cliente criado com sucesso");
      }
      await loadClients();
    } catch (error: any) {
      const message = error?.message ?? "Não foi possível salvar o cliente";
      toast.error(message);
      throw error;
    }
  };

  const handleToggleStatus = async (client: Client) => {
    try {
      await toggleClientStatus(client.id, !client.ativo);
      toast.success(`Cliente ${client.ativo ? "desativado" : "ativado"} com sucesso`);
      await loadClients();
    } catch (error: any) {
      const message = error?.message ?? "Não foi possível atualizar o status";
      toast.error(message);
    }
  };

  const stats = useMemo(() => {
    const total = clients.length;
    const ativos = clients.filter((client) => client.ativo).length;
    const inativos = total - ativos;
    const totalFidelidade = clients.reduce((acc, client) => acc + (client.pontos_fidelidade ?? 0), 0);
    const totalGasto = clients.reduce((acc, client) => acc + (client.valor_total ?? 0), 0);
    const totalCupons = clients.reduce((acc, client) => acc + (client.total_compras ?? 0), 0);
    const ticketMedioGeral = totalCupons > 0 ? totalGasto / totalCupons : 0;

    return {
      total,
      ativos,
      inativos,
      totalFidelidade,
      totalGasto,
      ticketMedioGeral,
    };
  }, [clients]);

  const filteredClients = clients;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie a base de clientes, pontos de fidelidade e histórico de compras.
          </p>
        </div>
        <Button icon={<UserPlus size={16} />} onClick={handleOpenCreate}>
          Novo cliente
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Total de clientes</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.total}</p>
          </div>
          <div className="rounded-full bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <Users size={20} />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Ativos</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.ativos}</p>
          </div>
          <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ArrowUpRight size={20} />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Inativos</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.inativos}</p>
          </div>
          <div className="rounded-full bg-slate-100 p-3 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
            <CircleSlash size={20} />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Ticket médio geral</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(stats.ticketMedioGeral)}
            </p>
          </div>
          <div className="rounded-full bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <DollarSign size={20} />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar por nome, CPF, email ou telefone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={statusFilter === "all" ? "primary" : "secondary"}
                onClick={() => setStatusFilter("all")}
              >
                Todos
              </Button>
              <Button
                type="button"
                variant={statusFilter === "active" ? "primary" : "secondary"}
                onClick={() => setStatusFilter("active")}
              >
                Ativos
              </Button>
              <Button
                type="button"
                variant={statusFilter === "inactive" ? "primary" : "secondary"}
                onClick={() => setStatusFilter("inactive")}
              >
                Inativos
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Fidelidade</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Total gasto</TableHead>
                <TableHead className="text-right">Última compra</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !filteredClients.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Carregando clientes...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length ? (
                filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{client.nome}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">ID: {client.id}</div>
                    </TableCell>
                    <TableCell>{client.cpf}</TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700 dark:text-slate-300">{client.email || "-"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{client.telefone || "-"}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm">
                        <Star size={14} className="text-amber-500" />
                        {client.pontos_fidelidade ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{client.total_compras}</TableCell>
                    <TableCell className="text-right font-medium">{client.valor_total_display}</TableCell>
                    <TableCell className="text-right text-sm">{formatDateTime(client.ultima_compra)}</TableCell>
                    <TableCell className="text-right">
                      <Badge tone={client.ativo ? "success" : "secondary"}>
                        {client.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditClient(client);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleStatus(client);
                          }}
                        >
                          {client.ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-slate-500">
                    Nenhum cliente encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card title="Resumo do cliente">
          {selectedClient ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Nome</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedClient.nome}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">CPF</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedClient.cpf}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Email</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedClient.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Telefone</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedClient.telefone || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Total gasto</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedClient.valor_total_display}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Ticket médio</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedClient.ticket_medio_display}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Total de itens</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedClient.total_itens}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Última compra</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {formatDateTime(selectedClient.ultima_compra)}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Endereço</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {selectedClient.endereco && Object.keys(selectedClient.endereco).length
                    ? [
                        selectedClient.endereco.logradouro,
                        selectedClient.endereco.numero,
                        selectedClient.endereco.bairro,
                        selectedClient.endereco.cidade,
                        selectedClient.endereco.uf,
                        selectedClient.endereco.cep,
                        selectedClient.endereco.complemento,
                      ]
                        .filter((value) => value && String(value).trim() !== "")
                        .join(", ")
                    : "Não informado"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Selecione um cliente na tabela para ver os detalhes.</p>
          )}
        </Card>

        <Card title="Indicadores da base">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Total gasto pela base</span>
              <span className="text-slate-900 dark:text-slate-100">{formatCurrency(stats.totalGasto)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Pontos de fidelidade acumulados</span>
              <span className="flex items-center gap-1">
                <Star size={14} className="text-amber-500" />
                {stats.totalFidelidade}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Clientes ativos</span>
              <span>{stats.ativos}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Clientes inativos</span>
              <span>{stats.inativos}</span>
            </div>
          </div>
        </Card>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitClient}
        client={modalClient}
      />
    </div>
  );
};

export default ClientsPage;
