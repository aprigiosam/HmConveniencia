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
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title align="center" order={2} style={{fontFamily: `Greycliff CF, sans-serif`}}>
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