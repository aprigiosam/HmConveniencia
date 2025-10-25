import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AppShell, Text, Burger, Group, NavLink, Button, Menu, Center, Loader, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaTachometerAlt, FaShoppingCart, FaBoxOpen, FaUsers, FaFileInvoiceDollar, FaCashRegister, FaHistory, FaChartBar, FaSignOutAlt, FaUserCircle, FaListAlt, FaSyncAlt, FaBuilding, FaClipboardList, FaCheckCircle } from 'react-icons/fa';
import { localDB } from './utils/db';
import { syncManager } from './utils/syncManager';
import { notificationManager } from './utils/notifications';
import { getEmpresas } from './services/api';

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
const Fornecedores = lazy(() => import('./pages/Fornecedores'));
const RelatorioFornecedores = lazy(() => import('./pages/RelatorioFornecedores'));
const Inventario = lazy(() => import('./pages/Inventario'));
const InventarioDetalhe = lazy(() => import('./pages/InventarioDetalhe'));
const ConferenciaLotes = lazy(() => import('./pages/ConferenciaLotes'));
const NotasFiscais = lazy(() => import('./pages/NotasFiscais'));
const Login = lazy(() => import('./pages/Login'));
const SyncStatus = lazy(() => import('./components/SyncStatus'));
const OfflineIndicator = lazy(() => import('./components/OfflineIndicator'));
const EmpresaSetup = lazy(() => import('./pages/EmpresaSetup'));

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
      { label: 'Categorias', path: '/categorias', icon: <FaListAlt /> },
      { label: 'Inventário', path: '/estoque/inventario', icon: <FaClipboardList /> },
      { label: 'Notas Fiscais', path: '/estoque/notas', icon: <FaFileInvoiceDollar /> },
      { label: 'Conferência de Lotes', path: '/estoque/conferencia', icon: <FaCheckCircle /> },
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
  { icon: <FaBuilding />, label: 'Dados da Empresa', path: '/setup/empresa' },
];

function AppContent() {
  const token = localStorage.getItem('token');
  const [opened, { toggle }] = useDisclosure(false);
  const location = useLocation();
  const [empresa, setEmpresa] = useState(() => {
    const stored = localStorage.getItem('empresa');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('empresa');
      return null;
    }
  });
  const [empresaLoading, setEmpresaLoading] = useState(false);

  useEffect(() => {
    localDB.init();
    syncManager.init();
    return () => syncManager.stop();
  }, []);

  useEffect(() => {
    if (!token || empresa) {
      return;
    }

    let cancelled = false;
    setEmpresaLoading(true);

    getEmpresas()
      .then((response) => {
        if (cancelled) {
          return;
        }
        const payload = response.data?.results ?? response.data;
        const empresaEncontrada = Array.isArray(payload) ? payload[0] : payload;
        if (empresaEncontrada) {
          localStorage.setItem('empresa', JSON.stringify(empresaEncontrada));
          setEmpresa(empresaEncontrada);
        }
      })
      .catch((error) => {
        console.warn('Não foi possível carregar a empresa automaticamente', error);
      })
      .finally(() => {
        if (!cancelled) {
          setEmpresaLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, empresa]);

  const handleEmpresaSaved = (empresaData) => {
    if (!empresaData) return;
    localStorage.setItem('empresa', JSON.stringify(empresaData));
    setEmpresa(empresaData);
  };

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

  if (token && empresaLoading && !empresa) {
    return <PageLoader />;
  }

  const needsEmpresa = token && !empresa;

  if (needsEmpresa) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/setup/empresa" element={<PrivateRoute><EmpresaSetup onSuccess={handleEmpresaSaved} /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/setup/empresa" replace />} />
        </Routes>
      </Suspense>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('empresa');
    window.location.href = '/login'; // Força o recarregamento para limpar o estado
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'xs', sm: 'md' }}
      style={{
        '--header-bg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <style>
        {`
          .app-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-bottom: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.25);
          }

          .app-navbar {
            background: linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%);
            border-right: 1px solid rgba(102, 126, 234, 0.15);
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.05);
          }

          .logo-container {
            background: rgba(255, 255, 255, 0.25);
            padding: 6px 10px;
            border-radius: 12px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }

          .logo-container:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: scale(1.05);
          }

          .brand-text {
            background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          }

          .user-menu-button {
            background: rgba(255, 255, 255, 0.2) !important;
            border: 2px solid rgba(255, 255, 255, 0.3) !important;
            transition: all 0.3s ease !important;
          }

          .user-menu-button:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: scale(1.05);
          }

          .nav-link-item {
            border-radius: 12px;
            margin-bottom: 6px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid transparent;
          }

          .nav-link-item:hover {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            transform: translateX(5px);
            border-color: rgba(102, 126, 234, 0.2);
          }

          .nav-link-item[data-active="true"] {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            border-color: rgba(255, 255, 255, 0.3);
          }

          .nav-link-item[data-active="true"] svg {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          }

          .app-main-content {
            min-height: calc(100vh - 70px);
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .route-enter {
            animation: slideIn 0.3s ease-out;
          }
        `}
      </style>

      <AppShell.Header className="app-header">
        <Group h="100%" px={{ base: 'md', sm: 'xl' }} justify="space-between">
          <Group gap="md">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="md"
              color="white"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
              }}
            />
            <div className="logo-container">
              <img
                src="/logo.jpeg"
                alt="HM Conveniência"
                style={{
                  height: '42px',
                  borderRadius: '6px',
                  display: 'block',
                }}
              />
            </div>
            <Text
              className="brand-text"
              size="xl"
              visibleFrom="xs"
            >
              HM Conveniência
            </Text>
          </Group>
          <Menu shadow="xl" width={220} position="bottom-end">
            <Menu.Target>
              <Button
                className="user-menu-button"
                size="md"
                leftSection={<FaUserCircle size={22} />}
                style={{
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                <Text visibleFrom="xs">Minha Conta</Text>
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<FaSignOutAlt />}
                onClick={handleLogout}
                color="red"
                style={{
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                Sair do Sistema
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={{ base: 'md', sm: 'lg' }} className="app-navbar">
        <ScrollArea type="scroll" style={{ height: '100%' }}>
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            c="dimmed"
            mb="md"
            style={{ letterSpacing: '1px' }}
          >
            Menu de Navegação
          </Text>
          {navLinks.map((link) => {
            const hasChildren = Array.isArray(link.children) && link.children.length > 0;
            if (!hasChildren) {
              return (
                <NavLink
                  key={link.label}
                  label={link.label}
                  leftSection={link.icon}
                  component={Link}
                  to={link.path}
                  active={location.pathname === link.path}
                  onClick={() => opened && toggle()}
                  className="nav-link-item"
                  data-active={location.pathname === link.path}
                  style={{
                    fontWeight: location.pathname === link.path ? 700 : 500,
                  }}
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
                className="nav-link-item"
                data-active={childActive}
                style={{
                  fontWeight: childActive ? 700 : 500,
                }}
              >
                {link.children.map((child) => (
                  <NavLink
                    key={child.path}
                    label={child.label}
                    leftSection={child.icon}
                    component={Link}
                    to={child.path}
                    active={location.pathname === child.path}
                    onClick={() => opened && toggle()}
                    className="nav-link-item"
                    data-active={location.pathname === child.path}
                    style={{
                      fontWeight: location.pathname === child.path ? 700 : 500,
                      marginLeft: '12px',
                    }}
                  />
                ))}
              </NavLink>
            );
          })}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main className="app-main-content">
        <Suspense fallback={<Center style={{ padding: '2rem' }}><Loader size="xl" variant="bars" /></Center>}>
          <div className="route-enter">
            <SyncStatus />
            <OfflineIndicator />
            <Routes>
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/alertas" element={<PrivateRoute><Alertas /></PrivateRoute>} />
              <Route path="/pdv" element={<PrivateRoute><PDV /></PrivateRoute>} />
              <Route path="/estoque" element={<PrivateRoute><Estoque /></PrivateRoute>} />
              <Route path="/estoque/inventario" element={<PrivateRoute><Inventario /></PrivateRoute>} />
              <Route path="/estoque/inventario/:id" element={<PrivateRoute><InventarioDetalhe /></PrivateRoute>} />
              <Route path="/produtos" element={<Navigate to="/estoque" replace />} />
              <Route path="/estoque/entrada" element={<Navigate to="/estoque/notas" replace />} />
              <Route path="/estoque/conferencia" element={<PrivateRoute><ConferenciaLotes /></PrivateRoute>} />
              <Route path="/estoque/notas" element={<PrivateRoute><NotasFiscais /></PrivateRoute>} />
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
              <Route path="/setup/empresa" element={<PrivateRoute><EmpresaSetup onSuccess={handleEmpresaSaved} /></PrivateRoute>} />
            </Routes>
          </div>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}

const shouldRegisterSW = import.meta.env.PROD;

function App() {
  useEffect(() => {
    // Registra o Service Worker para PWA apenas em builds (evita interferência no ambiente local)
    if (!shouldRegisterSW || !('serviceWorker' in navigator)) {
      return;
    }

    const onLoad = () => {
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
    };

    window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
