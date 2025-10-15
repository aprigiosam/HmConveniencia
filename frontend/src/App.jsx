import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import PDV from './pages/PDV'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import ContasReceber from './pages/ContasReceber'
import Caixa from './pages/Caixa'
import HistoricoCaixa from './pages/HistoricoCaixa'
import RelatorioLucro from './pages/RelatorioLucro'
import Categorias from './pages/Categorias'
import Login from './pages/Login'
import SyncStatus from './components/SyncStatus'
import { localDB } from './utils/db'
import { syncManager } from './utils/syncManager'
import { logout as logoutApi } from './services/api'
import './App.css'

// Componente para proteger rotas
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

// Componente da aplicação principal
function AppContent() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    // Tenta carregar o tema do localStorage, senão usa a preferência do sistema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Carrega usuário do localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    // Aplica a classe 'dark-mode' ao body
    document.body.className = theme + '-mode';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Inicializa o banco local
    localDB.init().then(() => {
      console.log('IndexedDB inicializado')
    })

    // Inicializa o gerenciador de sincronização
    syncManager.init()

    return () => {
      syncManager.stop()
    }
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    if (!confirm('Deseja realmente sair?')) return;

    try {
      await logoutApi();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Remove dados locais independentemente
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
    }
  };

  const token = localStorage.getItem('token');

  return (
      <div className="app">
        {token && (
        <nav className="navbar">
          <div className="container">
            <h1>🏪 HMConveniencia</h1>
            <div className="navbar-actions">
              {user && <span className="navbar-user">👤 {user.username}</span>}
              <button onClick={toggleTheme} className="btn-icon theme-toggle">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button onClick={handleLogout} className="btn-icon" title="Sair">
                🚪
              </button>
              <button className="hamburger-menu" onClick={toggleMobileMenu}>
                ☰
              </button>
            </div>
            <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
              <Link to="/" onClick={toggleMobileMenu}>Dashboard</Link>
              <Link to="/pdv" onClick={toggleMobileMenu}>PDV</Link>
              <Link to="/caixa" onClick={toggleMobileMenu}>Caixa</Link>
              <Link to="/produtos" onClick={toggleMobileMenu}>Produtos</Link>
              <Link to="/clientes" onClick={toggleMobileMenu}>Clientes</Link>
              <Link to="/contas-receber" onClick={toggleMobileMenu}>Contas a Receber</Link>
              <Link to="/caixa/historico" onClick={toggleMobileMenu}>Histórico de Caixas</Link>
              <Link to="/relatorios/lucro" onClick={toggleMobileMenu}>Relatório de Lucro</Link>
              <Link to="/categorias" onClick={toggleMobileMenu}>Categorias</Link>
            </div>
          </div>
        </nav>
        )}

        {token && <SyncStatus />}

        <main className={token ? "container" : ""}>
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
      </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App
