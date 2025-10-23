import { useNavigate, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaPlus } from 'react-icons/fa';
import { useMediaQuery } from '@mantine/hooks';

function FloatingActionButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Esconde o FAB em algumas páginas específicas
  const hideFabPaths = ['/pdv', '/login'];
  const shouldHide = hideFabPaths.some(path => location.pathname.startsWith(path));

  if (!isMobile || shouldHide) {
    return null;
  }

  const handleClick = () => {
    navigate('/pdv');
  };

  return (
    <div className="fab-container">
      <button
        className="fab-button"
        onClick={handleClick}
        aria-label="Abrir PDV"
        type="button"
      >
        <FaShoppingCart size={26} />
      </button>
      <span className="fab-tooltip">Nova Venda</span>
    </div>
  );
}

export default FloatingActionButton;
