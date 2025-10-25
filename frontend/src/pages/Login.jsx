import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../services/api';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Alert } from '@mantine/core';
import { FaExclamationCircle } from 'react-icons/fa';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await loginApi(username, password);
      const { token, user, empresa, empresa_required: empresaRequired } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (empresa) {
        localStorage.setItem('empresa', JSON.stringify(empresa));
      } else {
        localStorage.removeItem('empresa');
      }
      if (empresaRequired) {
        navigate('/setup/empresa');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img src="/logo.jpeg" alt="HM Conveniência" style={{ height: '100px', borderRadius: '8px' }} />
        </div>
        <Title align="center" order={2} style={{ fontFamily: 'Greycliff CF, sans-serif', color: '#FF6B35' }}>
          HM Conveniência
        </Title>
        <Text color="dimmed" size="sm" align="center" mt={5}>
          Acesse seu painel de controle
        </Text>

        {error && (
          <Alert icon={<FaExclamationCircle />} title="Erro no Login" color="red" withCloseButton onClose={() => setError('')} mt="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Usuário"
            placeholder="seu-usuario"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            mt="md"
          />
          <PasswordInput
            label="Senha"
            placeholder="sua senha"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            mt="md"
          />
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Entrar
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default Login;
