import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Button } from '../ui/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ClosedSession {
  id: number;
  codigo: string;
  fechada_em: string;
  responsavel_nome: string;
  saldo_fechamento_real: number;
}

export const ClosedSessionsList = () => {
  const [closedSessions, setClosedSessions] = useState<ClosedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClosedSessions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sales/sessoes/?status=FECHADA');
      setClosedSessions(response.data.results);
    } catch (error) {
      toast.error('Erro ao buscar sessões fechadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedSessions();
  }, []);

  const handleReopenSession = async (sessionId: number) => {
    const reason = prompt('Digite o motivo para reabrir a sessão:');
    if (!reason) {
      toast.error('O motivo é obrigatório para reabrir a sessão.');
      return;
    }

    try {
      await api.post(`/sales/sessoes/${sessionId}/reabrir/`, { motivo: reason });
      toast.success('Sessão reaberta com sucesso!');
      // Refresh the list of closed sessions
      fetchClosedSessions();
    } catch (error) {
      toast.error('Erro ao reabrir a sessão.');
    }
  };

  if (loading) {
    return <p>Carregando sessões fechadas...</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Fechada em</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Saldo Final</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {closedSessions.length > 0 ? (
          closedSessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>{session.codigo}</TableCell>
              <TableCell>{new Date(session.fechada_em).toLocaleString()}</TableCell>
              <TableCell>{session.responsavel_nome}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(session.saldo_fechamento_real)}
              </TableCell>
              <TableCell>
                <Button onClick={() => handleReopenSession(session.id)}>Reabrir</Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              Nenhuma sessão fechada encontrada.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
