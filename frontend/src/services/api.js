import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Clientes
export const getClientes = (params = {}) => api.get('/clientes/', { params });
export const getCliente = (id) => api.get(`/clientes/${id}/`);
export const createCliente = (data) => api.post('/clientes/', data);
export const updateCliente = (id, data) => api.put(`/clientes/${id}/`, data);
export const deleteCliente = (id) => api.delete(`/clientes/${id}/`);
export const getClientesComDividas = () => api.get('/clientes/com_dividas/');

// Produtos
export const getProdutos = (params = {}) => api.get('/produtos/', { params });
export const getProduto = (id) => api.get(`/produtos/${id}/`);
export const createProduto = (data) => api.post('/produtos/', data);
export const updateProduto = (id, data) => api.put(`/produtos/${id}/`, data);
export const deleteProduto = (id) => api.delete(`/produtos/${id}/`);
export const getProdutosMaisLucrativos = () => api.get('/produtos/mais_lucrativos/');

// Categorias
export const getCategorias = (params = {}) => api.get('/categorias/', { params });
export const getCategoria = (id) => api.get(`/categorias/${id}/`);
export const createCategoria = (data) => api.post('/categorias/', data);
export const updateCategoria = (id, data) => api.put(`/categorias/${id}/`, data);
export const deleteCategoria = (id) => api.delete(`/categorias/${id}/`);

// Vendas
export const getVendas = (params = {}) => api.get('/vendas/', { params });
export const getVenda = (id) => api.get(`/vendas/${id}/`);
export const createVenda = (data) => api.post('/vendas/', data);
export const cancelarVenda = (id) => api.post(`/vendas/${id}/cancelar/`);

// Contas a Receber
export const getContasReceber = (params = {}) => api.get('/vendas/contas_receber/', { params });
export const receberPagamento = (id) => api.post(`/vendas/${id}/receber/`);

// Dashboard
export const getDashboard = () => api.get('/vendas/dashboard/');

// Caixa
export const getCaixaStatus = () => api.get('/caixa/status/');
export const abrirCaixa = (data) => api.post('/caixa/abrir/', data);
export const fecharCaixa = (id, data) => api.post(`/caixa/${id}/fechar/`, data);
export const adicionarMovimentacao = (id, data) => api.post(`/caixa/${id}/movimentar/`, data);
export const getHistoricoCaixa = () => api.get('/caixa/historico/');

// Autenticação
export const login = (username, password) => api.post('/auth/login/', { username, password });
export const logout = () => api.post('/auth/logout/');
export const getMe = () => api.get('/auth/me/');

export default api;
