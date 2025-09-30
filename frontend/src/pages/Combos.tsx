import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { comboService } from '../services';
import toast from 'react-hot-toast';
import type { ProdutoCombo } from '../types';

export const CombosPage = () => {
  const [combos, setCombos] = useState<ProdutoCombo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCombos = async () => {
    setLoading(true);
    try {
      const data = await comboService.list();
      setCombos(data.results);
    } catch (error) {
      toast.error('Erro ao buscar combos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, []);

  const handleToggleStatus = async (id: number, ativo: boolean) => {
    try {
      await comboService.update(id, { ativo: !ativo });
      toast.success(`Combo ${!ativo ? 'ativado' : 'desativado'} com sucesso!`);
      fetchCombos();
    } catch (error) {
      toast.error('Erro ao atualizar status do combo.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar este combo?')) {
      try {
        await comboService.delete(id);
        toast.success('Combo deletado com sucesso!');
        fetchCombos();
      } catch (error) {
        toast.error('Erro ao deletar combo.');
      }
    }
  };

  if (loading) {
    return <p>Carregando combos...</p>;
  }

  return (
    <div className="space-y-6">
      <Card title="Combos de Produtos">
        <div className="mb-4">
          <Button onClick={() => toast('Modal de criação será implementado')}>
            Criar Novo Combo
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Preço Combo</TableHead>
              <TableHead>Preço Original</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combos.length > 0 ? (
              combos.map((combo) => (
                <TableRow key={combo.id}>
                  <TableCell>{combo.nome}</TableCell>
                  <TableCell>{combo.sku}</TableCell>
                  <TableCell>
                    <Badge tone={combo.tipo === 'FIXO' ? 'info' : 'warning'}>
                      {combo.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(Number(combo.preco_combo))}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(Number(combo.preco_original))}
                  </TableCell>
                  <TableCell>
                    {Number(combo.desconto_percentual).toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Badge tone={combo.ativo ? 'success' : 'secondary'}>
                      {combo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleStatus(combo.id, combo.ativo)}
                      className="mr-2"
                    >
                      {combo.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(combo.id)}>
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Nenhum combo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};