import { useState, useEffect } from 'react';
import {
  FileText, DollarSign, TrendingUp, ShoppingCart,
  AlertCircle, CheckCircle, Printer, Download, FileSpreadsheet, FileDown
} from 'lucide-react';
import api from '../services/api';
import { usePrinter } from '../hooks/usePrinter';
import toast from 'react-hot-toast';

interface SessionReportProps {
  sessionId: number;
  reportType?: 'X' | 'Z'; // X = parcial, Z = fechamento
  onClose?: () => void;
}

interface ReportData {
  sessao: {
    codigo: string;
    tipo: string;
    loja: {
      nome: string;
      cnpj?: string;
      endereco?: string;
    };
    responsavel: string;
    aberta_em: string;
    fechada_em?: string;
    status: string;
    data_relatorio: string;
  };
  resumo: {
    total_vendas: number;
    quantidade_vendas: number;
    total_descontos: number;
    ticket_medio: number;
    vendas_canceladas: number;
  };
  caixa: {
    saldo_inicial: number;
    total_vendas: number;
    total_sangrias: number;
    total_reforcos: number;
    saldo_teorico: number;
    saldo_real: number;
    diferenca: number;
  };
  formas_pagamento: Array<{
    nome: string;
    valor: number;
    quantidade: number;
  }>;
  movimentacoes: {
    sangrias: {
      total: number;
      quantidade: number;
    };
    reforcos: {
      total: number;
      quantidade: number;
    };
  };
  top_produtos: Array<{
    nome: string;
    sku: string;
    quantidade: number;
    valor: number;
  }>;
}

/**
 * Componente de visualização de relatório de sessão
 * Suporta relatórios X (parcial) e Z (fechamento)
 */
export function SessionReport({ sessionId, reportType = 'Z', onClose }: SessionReportProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { printReceipt, isPrinting } = usePrinter();

  useEffect(() => {
    loadReport();
  }, [sessionId, reportType]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = reportType === 'X'
        ? `/sales/sessoes/${sessionId}/relatorio_x/`
        : `/sales/sessoes/${sessionId}/relatorio_z/`;

      const { data } = await api.get(endpoint);
      setReport(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar relatório');
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!report) return;

    // Converte relatório para formato de impressão
    const receipt = {
      header: {
        storeName: report.sessao.loja.nome,
        address: report.sessao.loja.endereco,
        cnpj: report.sessao.loja.cnpj,
      },
      items: report.top_produtos.map(p => ({
        description: `${p.nome} (${p.sku})`,
        quantity: p.quantidade,
        price: p.valor / p.quantidade,
        total: p.valor,
      })),
      subtotal: report.resumo.total_vendas,
      discount: report.resumo.total_descontos,
      total: report.caixa.saldo_real,
      payments: report.formas_pagamento.map(fp => ({
        method: fp.nome,
        amount: fp.valor,
      })),
      footer: {
        message: `Relatório ${report.sessao.tipo} - ${report.sessao.codigo}`,
        date: new Date(report.sessao.data_relatorio),
        orderNumber: report.sessao.codigo,
      },
    };

    await printReceipt(receipt);
  };

  const handleExportJSON = () => {
    if (!report) return;

    // Export para JSON
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${report.sessao.tipo}-${report.sessao.codigo}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Relatório JSON exportado!');
  };

  const handleExportPDF = async () => {
    if (!report) return;

    try {
      toast.loading('Gerando PDF...');

      const response = await api.get(
        `/sales/sessoes/${sessionId}/exportar/pdf/?tipo=${reportType}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${report.sessao.tipo}-${report.sessao.codigo}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao exportar PDF');
      console.error('Erro ao exportar PDF:', error);
    }
  };

  const handleExportExcel = async () => {
    if (!report) return;

    try {
      toast.loading('Gerando Excel...');

      const response = await api.get(
        `/sales/sessoes/${sessionId}/exportar/excel/?tipo=${reportType}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${report.sessao.tipo}-${report.sessao.codigo}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao exportar Excel');
      console.error('Erro ao exportar Excel:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!report) return;

    try {
      toast.loading('Gerando CSV...');

      const response = await api.get(
        `/sales/sessoes/${sessionId}/exportar/csv/?tipo=${reportType}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${report.sessao.tipo}-${report.sessao.codigo}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao exportar CSV');
      console.error('Erro ao exportar CSV:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800">Erro ao carregar relatório</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button
              onClick={loadReport}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { sessao, resumo, caixa, formas_pagamento, movimentacoes, top_produtos } = report;

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">
                Relatório {sessao.tipo} - {sessao.codigo}
              </h2>
              <p className="text-blue-100 text-sm">
                {sessao.loja.nome} • {new Date(sessao.data_relatorio).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="
                px-4 py-2 bg-white/20 hover:bg-white/30
                text-white rounded-lg flex items-center gap-2
                transition-colors disabled:opacity-50
              "
              title="Imprimir relatório"
            >
              <Printer className="w-5 h-5" />
              {isPrinting ? 'Imprimindo...' : 'Imprimir'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="
                  px-4 py-2 bg-white/20 hover:bg-white/30
                  text-white rounded-lg flex items-center gap-2
                  transition-colors
                "
                title="Exportar relatório"
              >
                <Download className="w-5 h-5" />
                Exportar
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => {
                      handleExportPDF();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 rounded-t-lg"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    Exportar PDF
                  </button>
                  <button
                    onClick={() => {
                      handleExportExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Exportar Excel
                  </button>
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                  >
                    <FileDown className="w-4 h-4 text-blue-600" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => {
                      handleExportJSON();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 rounded-b-lg"
                  >
                    <FileDown className="w-4 h-4 text-purple-600" />
                    Exportar JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Vendas</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(resumo.total_vendas)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {resumo.quantidade_vendas} vendas
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(resumo.ticket_medio)}
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Saldo Real</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(caixa.saldo_real)}
            </p>
          </div>

          <div className={`border-2 rounded-lg p-4 ${
            Math.abs(caixa.diferenca) < 1
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {Math.abs(caixa.diferenca) < 1 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span className={`text-sm font-medium ${
                Math.abs(caixa.diferenca) < 1 ? 'text-green-800' : 'text-yellow-800'
              }`}>
                Diferença
              </span>
            </div>
            <p className={`text-2xl font-bold ${
              Math.abs(caixa.diferenca) < 1 ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                signDisplay: 'always',
              }).format(caixa.diferenca)}
            </p>
          </div>
        </div>

        {/* Caixa */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-bold text-gray-800 mb-3">💰 Movimentação de Caixa</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo Inicial:</span>
              <span className="font-medium">{formatCurrency(caixa.saldo_inicial)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>+ Vendas:</span>
              <span className="font-medium">{formatCurrency(caixa.total_vendas)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>- Sangrias:</span>
              <span className="font-medium">{formatCurrency(caixa.total_sangrias)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>+ Reforços:</span>
              <span className="font-medium">{formatCurrency(caixa.total_reforcos)}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2"></div>
            <div className="flex justify-between font-bold">
              <span>Saldo Teórico:</span>
              <span>{formatCurrency(caixa.saldo_teorico)}</span>
            </div>
            <div className="flex justify-between font-bold text-blue-600">
              <span>Saldo Real:</span>
              <span>{formatCurrency(caixa.saldo_real)}</span>
            </div>
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3">💳 Formas de Pagamento</h3>
          <div className="grid grid-cols-2 gap-3">
            {formas_pagamento.map((fp, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{fp.nome}</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(fp.valor)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{fp.quantidade} transações</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Produtos */}
        {top_produtos.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3">🏆 Produtos Mais Vendidos</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Produto</th>
                    <th className="text-right p-2">Quantidade</th>
                    <th className="text-right p-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {top_produtos.slice(0, 5).map((produto, idx) => (
                    <tr key={idx} className="border-t border-gray-200">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{produto.nome}</p>
                          <p className="text-xs text-gray-500">{produto.sku}</p>
                        </div>
                      </td>
                      <td className="text-right p-2">{produto.quantidade}</td>
                      <td className="text-right p-2 font-medium">
                        {formatCurrency(produto.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé */}
      {onClose && (
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}