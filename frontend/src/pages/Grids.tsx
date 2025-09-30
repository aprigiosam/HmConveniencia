import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { gridService } from '../services';
import toast from 'react-hot-toast';
import { GridModal } from '../components/grids/GridModal';
import type { GridProdutoPDV } from '../types';

export const GridsPage = () => {
  const [grids, setGrids] = useState<GridProdutoPDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState<GridProdutoPDV | undefined>(undefined);
  const navigate = useNavigate();

  const fetchGrids = async () => {
    setLoading(true);
    try {
      const data = await gridService.list();
      setGrids(data.results);
    } catch (error) {
      toast.error('Erro ao buscar grids.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrids();
  }, []);

  const handleCreateGrid = () => {
    setSelectedGrid(undefined);
    setIsModalOpen(true);
  };

  const handleEditGridName = (grid: GridProdutoPDV) => {
    setSelectedGrid(grid);
    setIsModalOpen(true);
  };

  const handleEditGridLayout = (gridId: number) => {
    navigate(`/grids/${gridId}/edit`);
  };

  const handleDeleteGrid = async (gridId: number) => {
    if (window.confirm('Tem certeza que deseja deletar este grid?')) {
      try {
        await gridService.delete(gridId);
        toast.success('Grid deletado com sucesso!');
        fetchGrids();
      } catch (error) {
        toast.error('Erro ao deletar grid.');
      }
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    fetchGrids();
  };

  if (loading) {
    return <p>Carregando grids...</p>;
  }

  return (
    <>
      <Card title="Grids de Produtos do PDV">
        <div className="mb-4">
          <Button onClick={handleCreateGrid}>Criar Novo Grid</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grids.length > 0 ? (
              grids.map((grid) => (
                <TableRow key={grid.id}>
                  <TableCell>{grid.nome}</TableCell>
                  <TableCell>{grid.loja}</TableCell>
                  <TableCell>{grid.usuario || 'N/A'}</TableCell>
                  <TableCell>
                    <Button variant="secondary" onClick={() => handleEditGridName(grid)} className="mr-2">
                      Editar Nome
                    </Button>
                    <Button variant="secondary" onClick={() => handleEditGridLayout(grid.id)} className="mr-2">
                      Editar Layout
                    </Button>
                    <Button variant="destructive" onClick={() => handleDeleteGrid(grid.id)}>
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhum grid encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {isModalOpen && (
        <GridModal
          grid={selectedGrid}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
};
