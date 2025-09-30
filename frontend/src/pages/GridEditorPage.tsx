import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { GridEditor } from '../components/grids/GridEditor';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Grid {
  id: number;
  nome: string;
  itens: any[]; // TODO: Define the type for grid items
}

export const GridEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrid = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/catalog/grids/${id}/`);
        setGrid(response.data);
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
