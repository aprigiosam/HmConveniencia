import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { promocaoService } from '../services';
import toast from 'react-hot-toast';
import type { Promocao } from '../types';
import { PromocaoModal } from '../components/promocoes/PromocaoModal';

export const PromocoesPage = () => {
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromocao, setSelectedPromocao] = useState<Promocao | undefined>(undefined);

  const fetchPromocoes = async () => {
    setLoading(true);
    try {
      const data = await promocaoService.list();
      setPromocoes(data.results);
    } catch (error) {
      toast.error('Erro ao buscar promoções.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromocoes();
  }, []);

  const handleToggleStatus = async (id: number, ativo: boolean) => {
    try {
      await promocaoService.update(id, { ativo: !ativo });
      toast.success(`Promoção ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      fetchPromocoes();
    } catch (error) {
      toast.error('Erro ao atualizar status da promoção.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar esta promoção?')) {
      try {
        await promocaoService.delete(id);
        toast.success('Promoção deletada com sucesso!');
        fetchPromocoes();
      } catch (error) {
        toast.error('Erro ao deletar promoção.');
      }
    }
  };

  const formatTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      DESCONTO_PERCENTUAL: 'Desconto %',
      DESCONTO_FIXO: 'Desconto R$',
      PRECO_FIXO: 'Preço Fixo',
      LEVE_PAGUE: 'Leve X Pague Y',
    };
    return tipos[tipo] || tipo;
  };

  if (loading) {
    return <p>Carregando promoções...</p>;
  }

  return (
    <div className="space-y-6">
      <Card title="Promoções">
        <div className="mb-4">
          <Button onClick={() => { setSelectedPromocao(undefined); setIsModalOpen(true); }}>
            Criar Nova Promoção
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promocoes.length > 0 ? (
              promocoes.map((promocao) => (
                <TableRow key={promocao.id}>
                  <TableCell>{promocao.nome}</TableCell>
                  <TableCell>
                    <Badge tone="info">{formatTipo(promocao.tipo)}</Badge>
                  </TableCell>
                  <TableCell>
                    {promocao.tipo.includes('PERCENTUAL')
                      ? `${Number(promocao.valor)}%`
                      : new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(promocao.valor))}
                  </TableCell>
                  <TableCell>
                    {new Date(promocao.data_inicio).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {new Date(promocao.data_fim).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge tone={promocao.ativo ? 'success' : 'secondary'}>
                      {promocao.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => { setSelectedPromocao(promocao); setIsModalOpen(true); }}
                      className="mr-2"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleStatus(promocao.id, promocao.ativo)}
                      className="mr-2"
                    >
                      {promocao.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(promocao.id)}>
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhuma promoção encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {isModalOpen && (
        <PromocaoModal
          promocao={selectedPromocao}
          onClose={() => setIsModalOpen(false)}
          onSave={() => { setIsModalOpen(false); fetchPromocoes(); }}
        />
      )}
    </div>
  );
};