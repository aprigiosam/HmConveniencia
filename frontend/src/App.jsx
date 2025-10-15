import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AppShell, Navbar, Header, Text, MediaQuery, Burger, Group, NavLink, Button, Menu } from '@mantine/core';
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
    localDB.init().then(() => console.log('IndexedDB inicializado'));
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
      padding="md"
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={<Navbar p="md" hidden={!opened} width={{ sm: 200, lg: 300 }}>
        {navLinks.map((link) => (
          <NavLink
            key={link.label}
            label={link.label}
            icon={link.icon}
            component={Link}
            to={link.path}
            active={location.pathname === link.path}
            onClick={toggle}
          />
        ))}
      </Navbar>}
      header={<Header height={{ base: 60, md: 70 }} p="md">
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
            <Burger opened={opened} onClick={toggle} size="sm" mr="xl" />
          </MediaQuery>
          <Group position="apart" style={{ width: '100%' }}>
            <Text weight={500} size="lg">HM Conveniência</Text>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button variant="subtle" color="gray"><FaUserCircle size={24} /></Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item icon={<FaSignOutAlt />} onClick={handleLogout}>Sair</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </div>
      </Header>}
    >
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