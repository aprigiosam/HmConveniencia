import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import PDV from './pages/PDV'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import ContasReceber from './pages/ContasReceber'
import Caixa from './pages/Caixa'
import HistoricoCaixa from './pages/HistoricoCaixa'
import SyncStatus from './components/SyncStatus'
import { localDB } from './utils/db'
import { syncManager } from './utils/syncManager'
import './App.css'

function App() {
  useEffect(() => {
    // Inicializa o banco local
    localDB.init().then(() => {
      console.log('IndexedDB inicializado')
    })

    // Inicializa o gerenciador de sincronização
    syncManager.init()

    return () => {
      syncManager.stop()
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="container">
            <h1>🏪 HMConveniencia</h1>
            <div className="nav-links">
              <Link to="/">Dashboard</Link>
              <Link to="/pdv">PDV</Link>
              <Link to="/caixa">Caixa</Link>
              <Link to="/produtos">Produtos</Link>
              <Link to="/clientes">Clientes</Link>
              <Link to="/contas-receber">Contas a Receber</Link>
              <Link to="/caixa/historico">Histórico de Caixas</Link>
            </div>
          </div>
        </nav>

        <SyncStatus />

        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/contas-receber" element={<ContasReceber />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/caixa/historico" element={<HistoricoCaixa />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
