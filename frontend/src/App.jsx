import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaHome, FaPlusCircle, FaUserFriends, FaBoxOpen, FaCashRegister, FaChartLine, FaSignOutAlt } from 'react-icons/fa';

import Dashboard from './pages/Dashboard';
import PDV from './pages/PDV';
import Produtos from './pages/Produtos';
import Clientes from './pages/Clientes';
import ContasReceber from './pages/ContasReceber';
import Caixa from './pages/Caixa';
import HistoricoCaixa from './pages/HistoricoCaixa';
import RelatorioLucro from './pages/RelatorioLucro';
import Categorias from './pages/Categorias';
import Login from './pages/Login';
import SyncStatus from './components/SyncStatus';
import { localDB } from './utils/db';
import { syncManager } from './utils/syncManager';
import { logout as logoutApi } from './services/api';

// Componente para proteger rotas
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

// Header que aparece em todas as páginas
function Header() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (!confirm('Deseja realmente sair?')) return;
        try {
            await logoutApi();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <header className="header" style={{ background: 'var(--gradient)', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>HM Conveniência</h1>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Sair">
                <FaSignOutAlt size={24} />
            </button>
        </header>
    );
}

// Barra de Navegação Inferior
function BottomNav() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Início', icon: <FaHome className="nav-icon" /> },
    { path: '/pdv', label: 'PDV', icon: <FaPlusCircle className="nav-icon" /> },
    { path: '/caixa', label: 'Caixa', icon: <FaCashRegister className="nav-icon" /> },
    { path: '/produtos', label: 'Produtos', icon: <FaBoxOpen className="nav-icon" /> },
    { path: '/clientes', label: 'Clientes', icon: <FaUserFriends className="nav-icon" /> },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <Link to={item.path} key={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
          {item.icon}
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

// Componente da aplicação principal
function AppContent() {
  const token = localStorage.getItem('token');

  useEffect(() => {
    localDB.init().then(() => console.log('IndexedDB inicializado'));
    syncManager.init();
    return () => syncManager.stop();
  }, []);

  return (
    <div className="app">
      {token && <Header />}
      {token && <SyncStatus />}

      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/pdv" element={<PrivateRoute><PDV /></PrivateRoute>} />
          <Route path="/produtos" element={<PrivateRoute><Produtos /></PrivateRoute>} />
          <Route path="/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
          <Route path="/contas-receber" element={<PrivateRoute><ContasReceber /></PrivateRoute>} />
          <Route path="/caixa" element={<PrivateRoute><Caixa /></PrivateRoute>} />
          <Route path="/caixa/historico" element={<PrivateRoute><HistoricoCaixa /></PrivateRoute>} />
          <Route path="/relatorios/lucro" element={<PrivateRoute><RelatorioLucro /></PrivateRoute>} />
          <Route path="/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
        </Routes>
      </main>

      {token && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;