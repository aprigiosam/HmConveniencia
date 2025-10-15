import { useState, useEffect } from 'react';
import { getDashboard, triggerBackup } from '../services/api';
import { FaDollarSign, FaExclamationTriangle, FaArchive, FaCashRegister, FaReceipt, FaChartLine } from 'react-icons/fa';

// Componente para os cards de estatísticas
const StatCard = ({ icon, label, value, detail, warning }) => (
  <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
    <div style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{icon}</div>
    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0' }}>{value}</p>
    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{label}</p>
    {detail && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{detail}</p>}
    {warning && <p style={{ fontSize: '0.8rem', color: 'var(--error)', fontWeight: 'bold' }}>{warning}</p>}
  </div>
);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const statsRes = await getDashboard();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!confirm('Deseja iniciar um backup do banco de dados?')) return;
    setBackupLoading(true);
    try {
      await triggerBackup();
      alert('Backup iniciado com sucesso!');
    } catch (error) { 
      console.error('Erro ao iniciar backup:', error);
      alert('Erro ao iniciar backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="dashboard">
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard 
          icon={<FaDollarSign />}
          label="Vendas Hoje"
          value={`R$ ${stats?.vendas_hoje?.total?.toFixed(2) || '0.00'}`}
          detail={`${stats?.vendas_hoje?.quantidade || 0} vendas`}
        />
        <StatCard 
          icon={<FaChartLine />}
          label="Lucro Hoje"
          value={`R$ ${stats?.lucro_hoje?.toFixed(2) || '0.00'}`}
        />
        <StatCard 
          icon={<FaReceipt />}
          label="Contas a Receber"
          value={`R$ ${stats?.contas_receber?.total?.toFixed(2) || '0.00'}`}
          warning={stats?.contas_receber?.vencidas?.quantidade > 0 ? `${stats.contas_receber.vencidas.quantidade} vencidas!` : null}
        />
        {stats?.caixa && (
          <StatCard 
            icon={<FaCashRegister />}
            label="Caixa Atual"
            value={`R$ ${stats.caixa.valor_atual?.toFixed(2) || '0.00'}`}
            detail={`Inicial: R$ ${stats.caixa.valor_inicial?.toFixed(2)}`}
          />
        )}
        <StatCard 
          icon={<FaExclamationTriangle />}
          label="Estoque Baixo"
          value={stats?.estoque_baixo || 0}
          detail="produtos"
        />
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="card-title">Manutenção</h3>
        <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>Realize o backup do banco de dados para segurança.</p>
        <button className="btn-secondary" onClick={handleBackup} disabled={backupLoading}>
          {backupLoading ? 'Processando...' : 'Fazer Backup'}
        </button>
      </div>
    </div>
  );
}

export default Dashboard;