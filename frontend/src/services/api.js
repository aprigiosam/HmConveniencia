import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;
