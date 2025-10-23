import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, UnstyledButton, Text, Stack, Group } from '@mantine/core';
import {
  FaTachometerAlt,
  FaShoppingCart,
  FaClipboardList,
  FaBoxOpen,
  FaBars
} from 'react-icons/fa';
import './BottomNav.css';

function BottomNav({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const mainNavItems = [
    { icon: <FaTachometerAlt size={20} />, label: 'Dashboard', path: '/' },
    { icon: <FaShoppingCart size={20} />, label: 'PDV', path: '/pdv' },
    { icon: <FaClipboardList size={20} />, label: 'Inventário', path: '/estoque/inventario' },
    { icon: <FaBoxOpen size={20} />, label: 'Estoque', path: '/estoque' },
    { icon: <FaBars size={20} />, label: 'Menu', action: 'menu' },
  ];

  const handleNavClick = (item) => {
    if (item.action === 'menu') {
      onMenuClick();
    } else {
      navigate(item.path);
    }
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Paper
      className="bottom-nav"
      shadow="lg"
      withBorder
    >
      <Group justify="space-around" gap={0} style={{ height: '100%' }}>
        {mainNavItems.map((item) => {
          const active = item.path ? isActive(item.path) : false;

          return (
            <UnstyledButton
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
            >
              <Stack align="center" gap={4}>
                <div className="bottom-nav-icon">
                  {item.icon}
                </div>
                <Text size="10px" fw={active ? 600 : 400} className="bottom-nav-label">
                  {item.label}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </Group>
    </Paper>
  );
}

export default BottomNav;
