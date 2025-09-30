import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { comboService } from '../../services';
import toast from 'react-hot-toast';
import type { ProdutoCombo } from '../../types';

interface ComboModalProps {
  combo?: ProdutoCombo;
  onClose: () => void;
  onSave: () => void;
}

export const ComboModal = ({ combo, onClose, onSave }: ComboModalProps) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    sku: '',
    tipo: 'FIXO' as 'FIXO' | 'FLEXIVEL',
    preco_combo: '',
    ativo: true,
  });

  useEffect(() => {
    if (combo) {
      setFormData({
        nome: combo.nome,
        descricao: combo.descricao || '',
        sku: combo.sku,
        tipo: combo.tipo,
        preco_combo: combo.preco_combo,
        ativo: combo.ativo,
      });
    }
  }, [combo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.sku || !formData.preco_combo) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      if (combo?.id) {
        await comboService.update(combo.id, formData);
        toast.success('Combo atualizado com sucesso!');
      } else {
        await comboService.create(formData);
        toast.success('Combo criado com sucesso!');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar combo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card title={combo?.id ? 'Editar Combo' : 'Criar Novo Combo'} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-4">
            <Input
              label="Nome do Combo *"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Combo Lanche Completo"
              required
            />

            <Input
              label="SKU *"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Ex: COMBO001"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'FIXO' | 'FLEXIVEL' })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="FIXO">Fixo</option>
                <option value="FLEXIVEL">Flexível</option>
              </select>
            </div>

            <Input
              label="Preço do Combo *"
              type="number"
              step="0.01"
              value={formData.preco_combo}
              onChange={(e) => setFormData({ ...formData, preco_combo: e.target.value })}
              placeholder="0.00"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                rows={3}
                placeholder="Descrição do combo..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="ativo" className="text-sm text-slate-700">
                Combo ativo
              </label>
            </div>
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