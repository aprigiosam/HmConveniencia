import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { GridEditor } from '../components/grids/GridEditor';
import { gridService } from '../services';
import toast from 'react-hot-toast';
import type { GridProdutoPDV } from '../types';

export const GridEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const [grid, setGrid] = useState<GridProdutoPDV | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrid = async () => {
      setLoading(true);
      try {
        const data = await gridService.get(Number(id));
        setGrid(data);
      } catch (error) {
        toast.error('Erro ao buscar grid.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGrid();
    }
  }, [id]);

  const handleSave = () => {
    // TODO: Implement save logic
    toast.success('Funcionalidade a ser implementada.');
  };

  if (loading) {
    return <p>Carregando editor de grid...</p>;
  }

  if (!grid) {
    return <p>Grid não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <Card title={`Editando Grid: ${grid.nome}`}>
        <div className="mb-4 flex justify-end">
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
        <GridEditor />
      </Card>
    </div>
  );
};
