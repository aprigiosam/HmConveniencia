import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { sessaoService } from '../../services';
import toast from 'react-hot-toast';
import { ValidationModal } from './ValidationModal';
import type { SessaoPDV, ValidationResult } from '../../types';

export const SessionManager = () => {
  const [session, setSession] = useState<SessaoPDV | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  const fetchSession = async () => {
    setLoading(true);
    try {
      // Assuming the store ID is 1 for now. This should be dynamic in a real app.
      const data = await sessaoService.getAberta(1);
      setSession(data);
    } catch (error: any) {
      if (error.status === 404) {
        setSession(null);
      } else {
        toast.error('Erro ao buscar sessão de caixa.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleOpenSession = async () => {
    const initialBalance = prompt('Digite o saldo inicial do caixa:');
    if (initialBalance === null) return;

    const initialBalanceValue = parseFloat(initialBalance);
    if (isNaN(initialBalanceValue) || initialBalanceValue < 0) {
      toast.error('Valor do saldo inicial inválido.');
      return;
    }

    try {
      // Assuming the store ID is 1 for now.
      const data = await sessaoService.create({
        loja: 1,
        saldo_inicial: initialBalanceValue,
      });
      setSession(data);
      toast.success('Caixa aberto com sucesso!');
    } catch (error) {
      toast.error('Erro ao abrir o caixa.');
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;

    try {
      const data = await sessaoService.validarFechamento(session.id);
      setValidationResult(data);
      setIsValidationModalOpen(true);
    } catch (error) {
      toast.error('Erro ao validar fechamento de caixa.');
    }
  };

  const confirmCloseSession = async () => {
    if (!session) return;

    const finalBalance = prompt('Digite o saldo final do caixa:');
    if (finalBalance === null) {
      setIsValidationModalOpen(false);
      return;
    }

    const finalBalanceValue = parseFloat(finalBalance);
    if (isNaN(finalBalanceValue) || finalBalanceValue < 0) {
      toast.error('Valor do saldo final inválido.');
      return;
    }

    try {
      await sessaoService.fechar(session.id, finalBalanceValue);
      setSession(null);
      toast.success('Caixa fechado com sucesso!');
    } catch (error) {
      toast.error('Erro ao fechar o caixa.');
    } finally {
      setIsValidationModalOpen(false);
    }
  };

  if (loading) {
    return <p>Carregando informações do caixa...</p>;
  }

  return (
    <>
      <Card title="Caixa do Dia">
        {session ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <Badge tone={session.status === 'ABERTA' ? 'success' : 'warning'}>
                  {session.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500">Operador</p>
                <p className="font-medium text-slate-800">{session.responsavel_nome}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Abertura</p>
                <p>{new Date(session.aberta_em).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Saldo Inicial</p>
                <p>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(Number(session.saldo_inicial))}
                </p>
              </div>
            </div>
            <Button onClick={handleCloseSession}>Fechar Caixa</Button>
          </div>
        ) : (
          <div>
            <p className="mb-4">O caixa está fechado.</p>
            <Button onClick={handleOpenSession}>Abrir Caixa</Button>
          </div>
        )}
      </Card>
      {isValidationModalOpen && validationResult && (
        <ValidationModal
          validationResult={validationResult}
          onConfirm={confirmCloseSession}
          onCancel={() => setIsValidationModalOpen(false)}
        />
      )}
    </>
  );
};