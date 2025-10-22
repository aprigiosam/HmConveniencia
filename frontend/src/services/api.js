import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://hmconveniencia-api.onrender.com/api',
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

// Fornecedores
export const getFornecedores = (params = {}) => api.get('/fornecedores/', { params });
export const getFornecedor = (id) => api.get(`/fornecedores/${id}/`);
export const createFornecedor = (data) => api.post('/fornecedores/', data);
export const updateFornecedor = (id, data) => api.put(`/fornecedores/${id}/`, data);
export const deleteFornecedor = (id) => api.delete(`/fornecedores/${id}/`);
export const getFornecedorLotes = (id) => api.get(`/fornecedores/${id}/lotes/`);
export const getFornecedorEstatisticas = (id) => api.get(`/fornecedores/${id}/estatisticas/`);

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

// Alertas
export const getAlertas = (params = {}) => api.get('/alertas/', { params });
export const getAlertasResumo = () => api.get('/alertas/resumo/');
export const getAlertasPorPrioridade = () => api.get('/alertas/por_prioridade/');
export const verificarAlertas = () => api.post('/alertas/verificar/');
export const marcarAlertaLido = (id) => api.post(`/alertas/${id}/marcar_lido/`);
export const resolverAlerta = (id) => api.post(`/alertas/${id}/resolver/`);
export const marcarTodosLidos = () => api.post('/alertas/marcar_todos_lidos/');

// Lotes
export const getLotes = (params = {}) => api.get('/lotes/', { params });
export const getLote = (id) => api.get(`/lotes/${id}/`);
export const createLote = (data) => api.post('/lotes/', data);
export const updateLote = (id, data) => api.put(`/lotes/${id}/`, data);
export const deleteLote = (id) => api.delete(`/lotes/${id}/`);
export const entradaEstoque = (data) => api.post('/lotes/entrada_estoque/', data);
export const baixarEstoqueLote = (id, quantidade) => api.post(`/lotes/${id}/baixar_estoque/`, { quantidade });
export const getLotesVencidos = () => api.get('/lotes/vencidos/');
export const getLotesProximosVencimento = () => api.get('/lotes/proximos_vencimento/');
export const getLotesPorProduto = (produtoId) => api.get(`/lotes/por_produto/?produto_id=${produtoId}`);

// NF-e de entrada
export const importarNFe = (file, extraFields = {}) => {
  const formData = new FormData();
  formData.append('xml', file);
  Object.entries(extraFields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value);
    }
  });

  return api.post('/entradas/importar-xml', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
