import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AppShell, Text, Burger, Group, NavLink, Button, Menu, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaTachometerAlt, FaShoppingCart, FaBoxOpen, FaUsers, FaFileInvoiceDollar, FaCashRegister, FaHistory, FaChartBar, FaTags, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';

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

// Componente para proteger rotas
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

const navLinks = [
  { icon: <FaTachometerAlt />, label: 'Dashboard', path: '/' },
  { icon: <FaShoppingCart />, label: 'PDV', path: '/pdv' },
  { icon: <FaCashRegister />, label: 'Caixa', path: '/caixa' },
  { icon: <FaBoxOpen />, label: 'Produtos', path: '/produtos' },
  { icon: <FaUsers />, label: 'Clientes', path: '/clientes' },
  { icon: <FaFileInvoiceDollar />, label: 'Contas a Receber', path: '/contas-receber' },
  { icon: <FaHistory />, label: 'Histórico de Caixas', path: '/caixa/historico' },
  { icon: <FaChartBar />, label: 'Relatório de Lucro', path: '/relatorios/lucro' },
  { icon: <FaTags />, label: 'Categorias', path: '/categorias' },
];

function AppContent() {
  const token = localStorage.getItem('token');
  const [opened, { toggle }] = useDisclosure(false);
  const location = useLocation();

  useEffect(() => {
    localDB.init();
    syncManager.init();
    return () => syncManager.stop();
  }, []);

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login'; // Força o recarregamento para limpar o estado
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <img src="/logo.jpeg" alt="HM Conveniência" style={{ height: '40px', borderRadius: '4px' }} />
            <Text fw={500} size="lg" style={{ color: '#FF6B35' }}>HM Conveniência</Text>
          </Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="subtle" color="gray"><FaUserCircle size={24} /></Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<FaSignOutAlt />} onClick={handleLogout}>Sair</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navLinks.map((link) => (
          <NavLink
            key={link.label}
            label={link.label}
            leftSection={link.icon}
            component={Link}
            to={link.path}
            active={location.pathname === link.path}
            onClick={toggle}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <SyncStatus />
        <Routes>
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
      </AppShell.Main>
    </AppShell>
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