import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginApi } from '../services/api'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await loginApi(username, password)
      const { token, user } = response.data

      // Salva token e dados do usuário
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      // Redireciona para dashboard
      navigate('/')
    } catch (err) {
      console.error('Erro no login:', err)
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>🏪 HMConveniencia</h1>
            <p>Sistema de PDV</p>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-footer">
            <small>Acesso restrito a usuários autorizados</small>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
