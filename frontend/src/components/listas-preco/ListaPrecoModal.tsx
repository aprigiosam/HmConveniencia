import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { listaPrecoService } from '../../services';
import toast from 'react-hot-toast';
import type { ListaPreco } from '../../types';

interface ListaPrecoModalProps {
  lista?: ListaPreco;
  onClose: () => void;
  onSave: () => void;
}

export const ListaPrecoModal = ({ lista, onClose, onSave }: ListaPrecoModalProps) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'NORMAL' as 'NORMAL' | 'ATACADO' | 'PROMOCIONAL' | 'PERSONALIZADA',
    data_inicio: '',
    data_fim: '',
    percentual_desconto: '',
    ativo: true,
  });

  useEffect(() => {
    if (lista) {
      setFormData({
        nome: lista.nome,
        descricao: lista.descricao || '',
        tipo: lista.tipo,
        data_inicio: lista.data_inicio ? lista.data_inicio.split('T')[0] : '',
        data_fim: lista.data_fim ? lista.data_fim.split('T')[0] : '',
        percentual_desconto: lista.percentual_desconto || '',
        ativo: lista.ativo,
      });
    }
  }, [lista]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const payload: any = {
        nome: formData.nome,
        descricao: formData.descricao,
        tipo: formData.tipo,
        ativo: formData.ativo,
      };

      if (formData.data_inicio) {
        payload.data_inicio = new Date(formData.data_inicio).toISOString();
      }

      if (formData.data_fim) {
        payload.data_fim = new Date(formData.data_fim).toISOString();
      }

      if (formData.percentual_desconto) {
        payload.percentual_desconto = formData.percentual_desconto;
      }

      if (lista?.id) {
        await listaPrecoService.update(lista.id, payload);
        toast.success('Lista de preço atualizada com sucesso!');
      } else {
        await listaPrecoService.create(payload);
        toast.success('Lista de preço criada com sucesso!');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar lista de preço.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card title={lista?.id ? 'Editar Lista de Preço' : 'Criar Nova Lista de Preço'} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-4">
            <Input
              label="Nome da Lista *"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Preços de Atacado"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="NORMAL">Normal</option>
                <option value="ATACADO">Atacado</option>
                <option value="PROMOCIONAL">Promocional</option>
                <option value="PERSONALIZADA">Personalizada</option>
              </select>
            </div>

            <Input
              label="Percentual de Desconto (%)"
              type="number"
              step="0.01"
              value={formData.percentual_desconto}
              onChange={(e) => setFormData({ ...formData, percentual_desconto: e.target.value })}
              placeholder="0.00"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Data Início"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />

              <Input
                label="Data Fim"
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                rows={3}
                placeholder="Descrição da lista de preço..."
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
                Lista ativa
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
