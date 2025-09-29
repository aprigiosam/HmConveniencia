import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import api from "../services/api";
import { InventoryEntryModal } from "../components/InventoryEntryModal";
import { InventoryAdjustmentModal } from "../components/InventoryAdjustmentModal";

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
  data_vencimento: string | null;
  quantidade: number;
  custo_unitario: string;
  status_vencimento: string;
  dias_vencimento: number | null;
  pode_vender: boolean;
};

type Movimentacao = {
  id: number;
  tipo: string;
  produto_nome: string;
  produto_sku: string;
  lote_numero: string | null;
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
  const [showAjusteModal, setShowAjusteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resumoRes, alertasRes, lotesRes, movRes] = await Promise.all([
        api.get('/inventory/estoque/resumo/'),
        api.get('/inventory/estoque/alertas_vencimento/'),
        api.get('/inventory/lotes/', { params: { com_estoque: true } }),
        api.get('/inventory/movimentacoes/'),
      ]);

      setResumo(resumoRes.data);
      setAlertas(alertasRes.data);
      setLotes(lotesRes.data.results || []);
      setMovimentacoes(movRes.data.results || []);
    } catch (error) {
      console.error('Erro ao carregar dados do estoque:', error);
    }
  };

  const formatCurrency = (value: number) => (
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );

  const formatDate = (dateString: string) => (
    new Date(dateString).toLocaleDateString('pt-BR')
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VENCIDO':
        return <Badge tone="danger">Vencido</Badge>;
      case 'PROXIMO_VENCIMENTO':
        return <Badge tone="warning">Proximo venc.</Badge>;
      case 'OK':
        return <Badge tone="success">OK</Badge>;
      default:
        return <Badge tone="secondary">Sem controle</Badge>;
    }
  };

  if (!resumo) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{resumo.total_produtos}</div>
            <div className="text-sm text-gray-600">Produtos ativos</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{resumo.total_lotes}</div>
            <div className="text-sm text-gray-600">Lotes em estoque</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{resumo.lotes_vencidos}</div>
            <div className="text-sm text-gray-600">Lotes vencidos</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{resumo.lotes_proximo_vencimento}</div>
            <div className="text-sm text-gray-600">Alertas de vencimento</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'resumo' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('resumo')}
            >
              Resumo
            </Button>
            <Button
              variant={activeTab === 'alertas' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('alertas')}
            >
              Alertas
            </Button>
            <Button
              variant={activeTab === 'lotes' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('lotes')}
            >
              Lotes
            </Button>
            <Button
              variant={activeTab === 'movimentacoes' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('movimentacoes')}
            >
              Movimentacoes
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              label="Filtrar"
              placeholder="SKU ou produto"
              className="w-60"
            />
          </div>
        </div>

        {activeTab === 'resumo' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <p className="text-sm text-slate-500">Valor total em estoque</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatCurrency(resumo.valor_total_estoque)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Proximos passos sugeridos</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                <li>Revise lotes vencidos e defina destino</li>
                <li>Antecipe reposicao para lotes com alerta</li>
                <li>Avalie margem dos itens com maior custo</li>
              </ul>
            </Card>
          </div>
        )}

        {activeTab === 'alertas' && (
          <div>
            {alertas.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum alerta de vencimento no momento.</p>
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
                          {alerta.tipo === "VENCIDO" ? "Vencido" : "Prox. venc."}
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
              <h3 className="text-lg font-semibold">Lotes em estoque</h3>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowAjusteModal(true)}>
                  Ajuste de estoque
                </Button>
                <Button onClick={() => setShowEntradaModal(true)}>Nova entrada</Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Custo unit.</TableHead>
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
            <h3 className="text-lg font-semibold mb-4">Movimentacoes recentes</h3>
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

      <InventoryEntryModal
        isOpen={showEntradaModal}
        onClose={() => setShowEntradaModal(false)}
        onSuccess={() => {
          setShowEntradaModal(false);
          void loadData();
        }}
      />
      <InventoryAdjustmentModal
        isOpen={showAjusteModal}
        onClose={() => setShowAjusteModal(false)}
        onSuccess={() => {
          setShowAjusteModal(false);
          void loadData();
        }}
      />
    </div>
  );
};
