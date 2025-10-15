import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AppShell, Text, Burger, Group, NavLink, Button, Menu, Center, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaTachometerAlt, FaShoppingCart, FaBoxOpen, FaUsers, FaFileInvoiceDollar, FaCashRegister, FaHistory, FaChartBar, FaTags, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';

// Lazy loading das páginas para reduzir bundle inicial
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PDV = lazy(() => import('./pages/PDV'));
const Produtos = lazy(() => import('./pages/Produtos'));
const Clientes = lazy(() => import('./pages/Clientes'));
const ContasReceber = lazy(() => import('./pages/ContasReceber'));
const Caixa = lazy(() => import('./pages/Caixa'));
const HistoricoCaixa = lazy(() => import('./pages/HistoricoCaixa'));
const RelatorioLucro = lazy(() => import('./pages/RelatorioLucro'));
const Categorias = lazy(() => import('./pages/Categorias'));
const Login = lazy(() => import('./pages/Login'));
const SyncStatus = lazy(() => import('./components/SyncStatus'));

import { localDB } from './utils/db';
import { syncManager } from './utils/syncManager';

// Loading component para Suspense
const PageLoader = () => (
  <Center style={{ height: '100vh' }}>
    <Loader size="lg" />
  </Center>
);

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
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
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'xs', sm: 'md' }}
    >
      <AppShell.Header>
        <Group h="100%" px={{ base: 'xs', sm: 'md' }} justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <img src="/logo.jpeg" alt="HM Conveniência" style={{ height: '36px', borderRadius: '4px' }} />
            <Text fw={500} size="lg" style={{ color: '#FF6B35' }} visibleFrom="xs">HM Conveniência</Text>
          </Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="subtle" color="gray" size="sm"><FaUserCircle size={20} /></Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<FaSignOutAlt />} onClick={handleLogout}>Sair</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={{ base: 'xs', sm: 'md' }}>
        {navLinks.map((link) => (
          <NavLink
            key={link.label}
            label={link.label}
            leftSection={link.icon}
            component={Link}
            to={link.path}
            active={location.pathname === link.path}
            onClick={() => opened && toggle()}
            style={{ borderRadius: '6px', marginBottom: '4px' }}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Suspense fallback={<Center style={{ padding: '2rem' }}><Loader /></Center>}>
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
        </Suspense>
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