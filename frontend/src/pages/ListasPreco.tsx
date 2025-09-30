import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { listaPrecoService } from '../services';
import toast from 'react-hot-toast';
import type { ListaPreco } from '../types';
import { ListaPrecoModal } from '../components/listas-preco/ListaPrecoModal';

export const ListasPrecoPage = () => {
  const [listas, setListas] = useState<ListaPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLista, setSelectedLista] = useState<ListaPreco | undefined>(undefined);

  const fetchListas = async () => {
    setLoading(true);
    try {
      const data = await listaPrecoService.list();
      setListas(data.results);
    } catch (error) {
      toast.error('Erro ao buscar listas de preços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListas();
  }, []);

  const handleToggleStatus = async (id: number, ativo: boolean) => {
    try {
      await listaPrecoService.update(id, { ativo: !ativo });
      toast.success(`Lista ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      fetchListas();
    } catch (error) {
      toast.error('Erro ao atualizar status da lista.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar esta lista de preços?')) {
      try {
        await listaPrecoService.delete(id);
        toast.success('Lista deletada com sucesso!');
        fetchListas();
      } catch (error) {
        toast.error('Erro ao deletar lista.');
      }
    }
  };

  if (loading) {
    return <p>Carregando listas de preços...</p>;
  }

  return (
    <div className="space-y-6">
      <Card title="Listas de Preços">
        <div className="mb-4">
          <Button onClick={() => { setSelectedLista(undefined); setIsModalOpen(true); }}>
            Criar Nova Lista
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listas.length > 0 ? (
              listas.map((lista) => (
                <TableRow key={lista.id}>
                  <TableCell>{lista.nome}</TableCell>
                  <TableCell>{lista.descricao || '-'}</TableCell>
                  <TableCell>
                    {lista.data_inicio
                      ? new Date(lista.data_inicio).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {lista.data_fim
                      ? new Date(lista.data_fim).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell>{lista.itens?.length || 0}</TableCell>
                  <TableCell>
                    <Badge tone={lista.ativo ? 'success' : 'secondary'}>
                      {lista.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => { setSelectedLista(lista); setIsModalOpen(true); }}
                      className="mr-2"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleStatus(lista.id, lista.ativo)}
                      className="mr-2"
                    >
                      {lista.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(lista.id)}>
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhuma lista de preços encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {isModalOpen && (
        <ListaPrecoModal
          lista={selectedLista}
          onClose={() => setIsModalOpen(false)}
          onSave={() => { setIsModalOpen(false); fetchListas(); }}
        />
      )}
    </div>
  );
};