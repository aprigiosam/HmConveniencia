import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AppShell, Text, Burger, Group, NavLink, Button, Menu, Center, Loader, ScrollArea } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { FaTachometerAlt, FaShoppingCart, FaBoxOpen, FaUsers, FaFileInvoiceDollar, FaCashRegister, FaHistory, FaChartBar, FaSignOutAlt, FaUserCircle, FaListAlt, FaSyncAlt, FaBell, FaTruck, FaBuilding, FaClipboardList } from 'react-icons/fa';
import { localDB } from './utils/db';
import { syncManager } from './utils/syncManager';
import { notificationManager } from './utils/notifications';
import { useSwipeGesture, useEdgeSwipe } from './hooks/useSwipeGesture';
import './components/PremiumNav.css';

// Lazy loading das páginas para reduzir bundle inicial
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PDV = lazy(() => import('./pages/PDV'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Clientes = lazy(() => import('./pages/Clientes'));
const ContasReceber = lazy(() => import('./pages/ContasReceber'));
const Caixa = lazy(() => import('./pages/Caixa'));
const HistoricoCaixa = lazy(() => import('./pages/HistoricoCaixa'));
const HistoricoVendas = lazy(() => import('./pages/HistoricoVendas'));
const GiroEstoque = lazy(() => import('./pages/GiroEstoque'));
const RelatorioLucro = lazy(() => import('./pages/RelatorioLucro'));
const Categorias = lazy(() => import('./pages/Categorias'));
const Alertas = lazy(() => import('./pages/Alertas'));
const EntradaEstoque = lazy(() => import('./pages/EntradaEstoque'));
const Fornecedores = lazy(() => import('./pages/Fornecedores'));
const RelatorioFornecedores = lazy(() => import('./pages/RelatorioFornecedores'));
const Inventario = lazy(() => import('./pages/Inventario'));
const InventarioDetalhe = lazy(() => import('./pages/InventarioDetalhe'));
const Login = lazy(() => import('./pages/Login'));
const SyncStatus = lazy(() => import('./components/SyncStatus'));
const OfflineIndicator = lazy(() => import('./components/OfflineIndicator'));
const FloatingActionButton = lazy(() => import('./components/FloatingActionButton'));

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

// Navegação com hierarquia (para desktop) e plana (para mobile)
const navLinksHierarchical = [
  { icon: <FaTachometerAlt />, label: 'Dashboard', path: '/' },
  {
    icon: <FaCashRegister />,
    label: 'Caixa',
    children: [
      { label: 'Visão do Caixa', path: '/caixa', icon: <FaCashRegister /> },
      { label: 'PDV', path: '/pdv', icon: <FaShoppingCart /> },
      { label: 'Histórico de Caixas', path: '/caixa/historico', icon: <FaHistory /> },
    ],
  },
  {
    icon: <FaBoxOpen />,
    label: 'Estoque',
    children: [
      { label: 'Visão Geral', path: '/estoque', icon: <FaBoxOpen /> },
      { label: 'Inventário', path: '/estoque/inventario', icon: <FaClipboardList /> },
      { label: 'Entrada de Estoque', path: '/estoque/entrada', icon: <FaTruck /> },
      { label: 'Fornecedores', path: '/fornecedores', icon: <FaBuilding /> },
    ],
  },
  {
    icon: <FaUsers />,
    label: 'Clientes',
    children: [
      { label: 'Clientes', path: '/clientes', icon: <FaUsers /> },
      { label: 'Contas a Receber', path: '/contas-receber', icon: <FaFileInvoiceDollar /> },
    ],
  },
  {
    icon: <FaChartBar />,
    label: 'Relatórios',
    children: [
      { label: 'Relatório de Lucro', path: '/relatorios/lucro', icon: <FaChartBar /> },
      { label: 'Relatório de Fornecedores', path: '/relatorios/fornecedores', icon: <FaBuilding /> },
      { label: 'Histórico de Vendas', path: '/vendas/historico', icon: <FaListAlt /> },
      { label: 'Giro de Estoque', path: '/estoque/giro', icon: <FaSyncAlt /> },
    ],
  },
];

// Lista plana para mobile
const navLinksFlat = [
  { icon: <FaTachometerAlt />, label: 'Dashboard', path: '/' },
  { icon: <FaShoppingCart />, label: 'PDV', path: '/pdv' },
  { icon: <FaCashRegister />, label: 'Caixa', path: '/caixa' },
  { icon: <FaBoxOpen />, label: 'Estoque', path: '/estoque' },
  { icon: <FaClipboardList />, label: 'Inventário', path: '/estoque/inventario' },
  { icon: <FaTruck />, label: 'Entrada de Estoque', path: '/estoque/entrada' },
  { icon: <FaBuilding />, label: 'Fornecedores', path: '/fornecedores' },
  { icon: <FaUsers />, label: 'Clientes', path: '/clientes' },
  { icon: <FaFileInvoiceDollar />, label: 'Contas a Receber', path: '/contas-receber' },
  { icon: <FaHistory />, label: 'Histórico de Caixas', path: '/caixa/historico' },
  { icon: <FaListAlt />, label: 'Histórico de Vendas', path: '/vendas/historico' },
  { icon: <FaSyncAlt />, label: 'Giro de Estoque', path: '/estoque/giro' },
  { icon: <FaChartBar />, label: 'Relatório de Lucro', path: '/relatorios/lucro' },
  { icon: <FaBuilding />, label: 'Relatório de Fornecedores', path: '/relatorios/fornecedores' },
];

function AppContent() {
  const token = localStorage.getItem('token');
  const [opened, { toggle, close, open }] = useDisclosure(false);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Suporte a gestos de swipe
  useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile && opened) {
        close();
      }
    },
  });

  useEdgeSwipe({
    onSwipeFromLeft: () => {
      if (isMobile && !opened) {
        open();
      }
    },
    edgeWidth: 30,
  });

  useEffect(() => {
    localDB.init();
    syncManager.init();
    return () => syncManager.stop();
  }, []);

  useEffect(() => {
    if (notificationManager.isSupported()) {
      const flagKey = 'hmconv_push_permission_requested';
      if (!localStorage.getItem(flagKey)) {
        notificationManager.requestPermission().finally(() => {
          localStorage.setItem(flagKey, '1');
        });
      }
    }
  }, []);

  // Fecha o menu ao navegar no mobile
  useEffect(() => {
    if (isMobile && opened) {
      close();
    }
  }, [location.pathname]);

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
    <>
      {/* Overlay escuro para mobile quando menu está aberto */}
      {isMobile && opened && (
        <div
          className="mobile-nav-overlay visible"
          onClick={close}
          style={{ zIndex: 199 }}
        />
      )}

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
        <ScrollArea type="auto" style={{ height: '100%' }}>
          {(isMobile ? navLinksFlat : navLinksHierarchical).map((link) => {
            const hasChildren = Array.isArray(link.children) && link.children.length > 0;

            if (!hasChildren) {
              return (
                <NavLink
                  key={link.path}
                  label={link.label}
                  leftSection={link.icon}
                  component={Link}
                  to={link.path}
                  active={location.pathname === link.path}
                  onClick={() => isMobile && close()}
                  className={isMobile ? "nav-item-ripple" : ""}
                />
              );
            }

            const childActive = link.children.some((child) => location.pathname === child.path);
            return (
              <NavLink
                key={link.label}
                label={link.label}
                leftSection={link.icon}
                active={childActive}
                defaultOpened={childActive}
              >
                {link.children.map((child) => (
                  <NavLink
                    key={child.path}
                    label={child.label}
                    leftSection={child.icon}
                    component={Link}
                    to={child.path}
                    active={location.pathname === child.path}
                    onClick={() => isMobile && close()}
                  />
                ))}
              </NavLink>
            );
          })}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Suspense fallback={<Center style={{ padding: '2rem' }}><Loader /></Center>}>
          <SyncStatus />
          <OfflineIndicator />
          <FloatingActionButton />
          <Routes>
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/alertas" element={<PrivateRoute><Alertas /></PrivateRoute>} />
            <Route path="/pdv" element={<PrivateRoute><PDV /></PrivateRoute>} />
            <Route path="/estoque" element={<PrivateRoute><Estoque /></PrivateRoute>} />
            <Route path="/estoque/inventario" element={<PrivateRoute><Inventario /></PrivateRoute>} />
            <Route path="/estoque/inventario/:id" element={<PrivateRoute><InventarioDetalhe /></PrivateRoute>} />
            <Route path="/produtos" element={<Navigate to="/estoque" replace />} />
            <Route path="/estoque/entrada" element={<PrivateRoute><EntradaEstoque /></PrivateRoute>} />
            <Route path="/fornecedores" element={<PrivateRoute><Fornecedores /></PrivateRoute>} />
            <Route path="/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
            <Route path="/contas-receber" element={<PrivateRoute><ContasReceber /></PrivateRoute>} />
            <Route path="/vendas/historico" element={<PrivateRoute><HistoricoVendas /></PrivateRoute>} />
            <Route path="/estoque/giro" element={<PrivateRoute><GiroEstoque /></PrivateRoute>} />
            <Route path="/caixa" element={<PrivateRoute><Caixa /></PrivateRoute>} />
            <Route path="/caixa/historico" element={<PrivateRoute><HistoricoCaixa /></PrivateRoute>} />
            <Route path="/relatorios/lucro" element={<PrivateRoute><RelatorioLucro /></PrivateRoute>} />
            <Route path="/relatorios/fornecedores" element={<PrivateRoute><RelatorioFornecedores /></PrivateRoute>} />
            <Route path="/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
          </Routes>
        </Suspense>
      </AppShell.Main>
    </AppShell>
    </>
  );
}

function App() {
  useEffect(() => {
    // Registra o Service Worker para PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);

            // Escuta mensagens do Service Worker
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data.type === 'SYNC_VENDAS') {
                console.log('[PWA] Recebida solicitação de sincronização de vendas');
                syncManager.syncAll();
              }
            });

            // Verifica atualizações periodicamente
            setInterval(() => {
              registration.update();
            }, 60000); // Verifica a cada 1 minuto
          })
          .catch((error) => {
            console.error('[PWA] Falha ao registrar Service Worker:', error);
          });
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
