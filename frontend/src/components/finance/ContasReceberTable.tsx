import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Badge } from '../ui/Badge';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ContaReceber {
  id: number;
  descricao: string;
  venda_numero: string;
  data_vencimento: string;
  valor: number;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
}

export const ContasReceberTable = () => {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/contas-receber/');
      setContas(response.data.results);
    } catch (error) {
      toast.error('Erro ao buscar contas a receber.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, []);

  if (loading) {
    return <p>Carregando contas a receber...</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contas.length > 0 ? (
          contas.map((conta) => (
            <TableRow key={conta.id}>
              <TableCell>{conta.descricao}</TableCell>
              <TableCell>{conta.venda_numero}</TableCell>
              <TableCell>{new Date(conta.data_vencimento).toLocaleDateString()}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(conta.valor)}
              </TableCell>
              <TableCell>
                <Badge tone={conta.status === 'PAGO' ? 'success' : 'warning'}>
                  {conta.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              Nenhuma conta a receber encontrada.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
