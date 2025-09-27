import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import api from "../services/api";

type EstoqueResumo = {
  total_produtos: number;
  total_lotes: number;
  lotes_vencidos: number;
  lotes_proximo_vencimento: number;
  valor_total_estoque: number;
};

type AlertaVencimento = {
  tipo: string;
  prioridade: string;
  produto_nome: string;
  produto_sku: string;
  numero_lote: string;
  data_vencimento: string;
  dias_vencimento: number;
  quantidade: number;
  pode_vender: boolean;
};

type Lote = {
  id: number;
  numero_lote: string;
  produto_nome: string;
  produto_sku: string;
  data_vencimento: string;
  quantidade: number;
  custo_unitario: string;
  status_vencimento: string;
  dias_vencimento: number;
  pode_vender: boolean;
};

type Movimentacao = {
  id: number;
  tipo: string;
  produto_nome: string;
  produto_sku: string;
  lote_numero: string;
  quantidade: number;
  motivo: string;
  created_at: string;
};

export const InventoryPage = () => {
  const [resumo, setResumo] = useState<EstoqueResumo | null>(null);
  const [alertas, setAlertas] = useState<AlertaVencimento[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [activeTab, setActiveTab] = useState<'resumo' | 'alertas' | 'lotes' | 'movimentacoes'>('resumo');
  const [showEntradaModal, setShowEntradaModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resumoRes, alertasRes, lotesRes, movRes] = await Promise.all([
        api.get('/inventory/estoque/resumo/'),
        api.get('/inventory/estoque/alertas_vencimento/'),
        api.get('/inventory/lotes/?com_estoque=true'),
        api.get('/inventory/movimentacoes/')
      ]);

      setResumo(resumoRes.data);
      setAlertas(alertasRes.data);
      setLotes(lotesRes.data.results || []);
      setMovimentacoes(movRes.data.results || []);
    } catch (error) {
      console.error('Erro ao carregar dados do estoque:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VENCIDO':
        return <Badge tone="danger">Vencido</Badge>;
      case 'PROXIMO_VENCIMENTO':
        return <Badge tone="warning">Próximo Venc.</Badge>;
      case 'OK':
        return <Badge tone="success">OK</Badge>;
      default:
        return <Badge tone="secondary">Sem Controle</Badge>;
    }
  };

  if (!resumo) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{resumo.total_produtos}</div>
            <div className="text-sm text-gray-600">Produtos Ativos</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{resumo.total_lotes}</div>
            <div className="text-sm text-gray-600">Lotes em Estoque</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{resumo.lotes_vencidos}</div>
            <div className="text-sm text-gray-600">Lotes Vencidos</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{resumo.lotes_proximo_vencimento}</div>
            <div className="text-sm text-gray-600">Próx. Vencimento</div>
          </div>
        </Card>
      </div>

      {/* Valor Total do Estoque */}
      <Card>
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">Valor Total do Estoque</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(resumo.valor_total_estoque)}
          </div>
        </div>
      </Card>

      {/* Navegação por Abas */}
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: "Resumo", value: "resumo" },
            { label: "Alertas de Vencimento", value: "alertas" },
            { label: "Lotes", value: "lotes" },
            { label: "Movimentações", value: "movimentacoes" },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "primary" : "secondary"}
              onClick={() => setActiveTab(tab.value as any)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'alertas' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Alertas de Vencimento</h3>
              <Badge tone={alertas.length > 0 ? "danger" : "success"}>
                {alertas.length} Alertas
              </Badge>
            </div>

            {alertas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                🎉 Nenhum alerta de vencimento!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertas.map((alerta, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{alerta.produto_nome}</div>
                          <div className="text-sm text-gray-500">{alerta.produto_sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>{alerta.numero_lote}</TableCell>
                      <TableCell>{formatDate(alerta.data_vencimento)}</TableCell>
                      <TableCell>
                        <span className={alerta.dias_vencimento < 0 ? "text-red-600 font-bold" : "text-yellow-600"}>
                          {alerta.dias_vencimento < 0 ?
                            `${Math.abs(alerta.dias_vencimento)} dias vencido` :
                            `${alerta.dias_vencimento} dias`
                          }
                        </span>
                      </TableCell>
                      <TableCell>{alerta.quantidade}</TableCell>
                      <TableCell>
                        <Badge tone={alerta.tipo === "VENCIDO" ? "danger" : "warning"}>
                          {alerta.tipo === "VENCIDO" ? "Vencido" : "Próx. Venc."}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {activeTab === 'lotes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Lotes em Estoque</h3>
              <Button onClick={() => setShowEntradaModal(true)}>Nova Entrada</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Custo Unit.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lote.produto_nome}</div>
                        <div className="text-sm text-gray-500">{lote.produto_sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>{lote.numero_lote}</TableCell>
                    <TableCell>
                      {lote.data_vencimento ? formatDate(lote.data_vencimento) : 'N/A'}
                    </TableCell>
                    <TableCell>{lote.quantidade}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(lote.custo_unitario))}</TableCell>
                    <TableCell>{getStatusBadge(lote.status_vencimento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'movimentacoes' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Movimentações Recentes</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <Badge tone={
                        mov.tipo === "ENTRADA" ? "success" :
                        mov.tipo === "SAIDA" ? "danger" : "warning"
                      }>
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mov.produto_nome}</div>
                        <div className="text-sm text-gray-500">{mov.produto_sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>{mov.lote_numero || 'N/A'}</TableCell>
                    <TableCell className="font-mono">
                      {mov.tipo === "ENTRADA" ? "+" : ""}{mov.quantidade}
                    </TableCell>
                    <TableCell>{mov.motivo}</TableCell>
                    <TableCell>{formatDate(mov.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
