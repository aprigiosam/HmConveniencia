import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { gridService } from '../../services';
import toast from 'react-hot-toast';
import type { GridProdutoPDV } from '../../types';

interface GridModalProps {
  grid?: GridProdutoPDV;
  onClose: () => void;
  onSave: () => void;
}

export const GridModal = ({ grid, onClose, onSave }: GridModalProps) => {
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (grid) {
      setNome(grid.nome);
    }
  }, [grid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) {
      toast.error('O nome do grid é obrigatório.');
      return;
    }

    const payload = {
      nome,
      loja: 1, // Assuming store ID is 1 for now
    };

    try {
      if (grid?.id) {
        await gridService.update(grid.id, payload);
        toast.success('Grid atualizado com sucesso!');
      } else {
        await gridService.create(payload);
        toast.success('Grid criado com sucesso!');
      }
      onSave();
    } catch (error) {
      toast.error('Erro ao salvar grid.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card title={grid?.id ? 'Editar Grid' : 'Criar Novo Grid'} className="w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <Input
              label="Nome do Grid"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Bebidas, Lanches"
              required
            />
          </div>
          <div className="flex justify-end space-x-4 border-t border-slate-200 p-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
