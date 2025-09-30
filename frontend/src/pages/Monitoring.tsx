import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle, Clock, Database, Server, Zap } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  response_time_ms: number
  checks: {
    database: {
      status: 'healthy' | 'unhealthy'
      message: string
    }
    redis: {
      status: 'healthy' | 'unhealthy'
      message: string
    }
  }
}

interface SystemMetrics {
  timestamp: string
  database: {
    produtos_total: number
    categorias_total: number
    fornecedores_total: number
    vendas_total: number
    vendas_hoje: number
    vendas_ultima_semana: number
  }
  vendas_24h: {
    total_valor: number
    total_vendas: number
  }
  performance: {
    active_connections: number
  }
}

interface SystemStatus {
  timestamp: string
  uptime?: {
    process_uptime: number
  }
  memory?: {
    usage_percent: number
    available_gb: number
    total_gb: number
  }
  disk?: {
    usage_percent: number
    free_gb: number
    total_gb: number
  }
  cpu?: {
    usage_percent: number
    cores: number
  }
  message?: string
}

export default function Monitoring() {
  const [healthData, setHealthData] = useState<HealthCheck | null>(null)
  const [metricsData, setMetricsData] = useState<SystemMetrics | null>(null)
  const [statusData, setStatusData] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealthCheck = async () => {
    try {
      const response = await fetch('/api/v1/health/')
      const data = await response.json()
      setHealthData(data)
    } catch (error) {
      console.error('Error fetching health check:', error)
      toast.error('Erro ao buscar status de saúde do sistema')
    }
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/metrics/')
      const data = await response.json()
      setMetricsData(data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      toast.error('Erro ao buscar métricas do sistema')
    }
  }

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/status/')
      const data = await response.json()
      setStatusData(data)
    } catch (error) {
      console.error('Error fetching system status:', error)
      toast.error('Erro ao buscar status do sistema')
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchHealthCheck(),
      fetchMetrics(),
      fetchSystemStatus()
    ])
    setLoading(false)
  }

  useEffect(() => {
    fetchAllData()

    // Auto refresh a cada 30 segundos se habilitado
    let interval: any
    if (autoRefresh) {
      interval = setInterval(fetchAllData, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'unhealthy':
        return 'text-red-600'
      default:
        return 'text-yellow-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5" />
      case 'unhealthy':
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitoramento do Sistema</h1>
            <p className="text-gray-600 mt-2">Status em tempo real e métricas de performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Auto-refresh (30s)</span>
            </label>
            <button
              onClick={fetchAllData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Health Check Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Status Geral</h3>
              <div className={`flex items-center mt-2 ${getStatusColor(healthData?.status || 'unknown')}`}>
                {getStatusIcon(healthData?.status || 'unknown')}
                <span className="ml-2 font-medium capitalize">{healthData?.status || 'Desconhecido'}</span>
              </div>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Tempo de resposta: {healthData?.response_time_ms}ms</p>
            <p>Ambiente: {healthData?.environment}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Database</h3>
              <div className={`flex items-center mt-2 ${getStatusColor(healthData?.checks?.database?.status || 'unknown')}`}>
                {getStatusIcon(healthData?.checks?.database?.status || 'unknown')}
                <span className="ml-2 font-medium capitalize">{healthData?.checks?.database?.status || 'Desconhecido'}</span>
              </div>
            </div>
            <Database className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>{healthData?.checks?.database?.message}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Redis Cache</h3>
              <div className={`flex items-center mt-2 ${getStatusColor(healthData?.checks?.redis?.status || 'unknown')}`}>
                {getStatusIcon(healthData?.checks?.redis?.status || 'unknown')}
                <span className="ml-2 font-medium capitalize">{healthData?.checks?.redis?.status || 'Desconhecido'}</span>
              </div>
            </div>
            <Zap className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>{healthData?.checks?.redis?.message}</p>
          </div>
        </div>
      </div>

      {/* Business Metrics */}
      {metricsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{metricsData.database.produtos_total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Categorias:</span>
                <span className="font-medium">{metricsData.database.categorias_total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fornecedores:</span>
                <span className="font-medium">{metricsData.database.fornecedores_total}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{metricsData.database.vendas_total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hoje:</span>
                <span className="font-medium">{metricsData.database.vendas_hoje}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Esta semana:</span>
                <span className="font-medium">{metricsData.database.vendas_ultima_semana}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">24 Horas</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Vendas:</span>
                <span className="font-medium">{metricsData.vendas_24h.total_vendas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-medium">R$ {metricsData.vendas_24h.total_valor.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Conexões DB:</span>
                <span className="font-medium">{metricsData.performance.active_connections}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Resources */}
      {statusData && statusData.memory && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Memória</h3>
              <Server className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Uso:</span>
                <span className="font-medium">{statusData.memory.usage_percent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Disponível:</span>
                <span className="font-medium">{statusData.memory.available_gb} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{statusData.memory.total_gb} GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${statusData.memory.usage_percent}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">CPU</h3>
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Uso:</span>
                <span className="font-medium">{statusData.cpu?.usage_percent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cores:</span>
                <span className="font-medium">{statusData.cpu?.cores}</span>
              </div>
              {statusData.uptime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="font-medium">{formatUptime(statusData.uptime.process_uptime)}</span>
                </div>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${statusData.cpu?.usage_percent || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Disco</h3>
              <Database className="h-6 w-6 text-purple-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Uso:</span>
                <span className="font-medium">{statusData.disk?.usage_percent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Livre:</span>
                <span className="font-medium">{statusData.disk?.free_gb} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{statusData.disk?.total_gb} GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${statusData.disk?.usage_percent || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {statusData?.message && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">{statusData.message}</p>
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        Última atualização: {new Date().toLocaleString('pt-BR')}
      </div>
    </div>
  )
}