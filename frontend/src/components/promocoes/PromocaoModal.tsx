import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { promocaoService } from '../../services';
import toast from 'react-hot-toast';
import type { Promocao } from '../../types';

interface PromocaoModalProps {
  promocao?: Promocao;
  onClose: () => void;
  onSave: () => void;
}

export const PromocaoModal = ({ promocao, onClose, onSave }: PromocaoModalProps) => {
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'DESCONTO_PERCENTUAL' as Promocao['tipo'],
    valor: '',
    data_inicio: '',
    data_fim: '',
    quantidade_minima: 0,
    ativo: true,
  });

  useEffect(() => {
    if (promocao) {
      setFormData({
        nome: promocao.nome,
        tipo: promocao.tipo,
        valor: promocao.valor,
        data_inicio: promocao.data_inicio.split('T')[0],
        data_fim: promocao.data_fim.split('T')[0],
        quantidade_minima: promocao.quantidade_minima || 0,
        ativo: promocao.ativo,
      });
    }
  }, [promocao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.valor || !formData.data_inicio || !formData.data_fim) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...formData,
        data_inicio: new Date(formData.data_inicio).toISOString(),
        data_fim: new Date(formData.data_fim).toISOString(),
      };

      if (promocao?.id) {
        await promocaoService.update(promocao.id, payload);
        toast.success('Promoção atualizada com sucesso!');
      } else {
        await promocaoService.create(payload);
        toast.success('Promoção criada com sucesso!');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar promoção.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card title={promocao?.id ? 'Editar Promoção' : 'Criar Nova Promoção'} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-4">
            <Input
              label="Nome da Promoção *"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Desconto de Verão"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Promoção *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Promocao['tipo'] })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="DESCONTO_PERCENTUAL">Desconto Percentual</option>
                <option value="DESCONTO_FIXO">Desconto Fixo (R$)</option>
                <option value="PRECO_FIXO">Preço Fixo</option>
                <option value="LEVE_PAGUE">Leve X Pague Y</option>
              </select>
            </div>

            <Input
              label={formData.tipo.includes('PERCENTUAL') ? 'Valor (%) *' : 'Valor (R$) *'}
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder="0.00"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Data Início *"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                required
              />

              <Input
                label="Data Fim *"
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                required
              />
            </div>

            <Input
              label="Quantidade Mínima"
              type="number"
              value={formData.quantidade_minima}
              onChange={(e) => setFormData({ ...formData, quantidade_minima: Number(e.target.value) })}
              placeholder="0"
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="ativo" className="text-sm text-slate-700">
                Promoção ativa
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