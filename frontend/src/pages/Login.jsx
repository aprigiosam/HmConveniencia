import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../services/api';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Alert,
  Box,
  Stack,
  Group,
  Transition
} from '@mantine/core';
import { FaExclamationCircle, FaUser, FaLock, FaStore } from 'react-icons/fa';
import { useMediaQuery } from '@mantine/hooks';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  useState(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

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
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '1rem' : '2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .login-container {
            animation: fadeInUp 0.6s ease-out;
          }

          .glass-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow:
              0 8px 32px 0 rgba(31, 38, 135, 0.37),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.5);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .glass-card:hover {
            transform: translateY(-5px);
            box-shadow:
              0 12px 48px 0 rgba(31, 38, 135, 0.45),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.6);
          }

          .logo-container {
            animation: float 3s ease-in-out infinite;
            filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
          }

          .input-wrapper input {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 2px solid rgba(255, 255, 255, 0.3) !important;
            transition: all 0.3s ease !important;
          }

          .input-wrapper input:focus {
            background: rgba(255, 255, 255, 1) !important;
            border-color: #FF6B35 !important;
            box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1) !important;
          }

          .submit-button {
            background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%) !important;
            border: none !important;
            transition: all 0.3s ease !important;
          }

          .submit-button:hover {
            background: linear-gradient(135deg, #FF8E53 0%, #FF6B35 100%) !important;
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(255, 107, 53, 0.4) !important;
          }

          .submit-button:active {
            transform: translateY(0);
          }

          .decorative-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(60px);
            opacity: 0.3;
            animation: float 6s ease-in-out infinite;
          }

          .blob-1 {
            width: 300px;
            height: 300px;
            background: #FF6B35;
            top: -100px;
            right: -100px;
            animation-delay: 0s;
          }

          .blob-2 {
            width: 250px;
            height: 250px;
            background: #4facfe;
            bottom: -80px;
            left: -80px;
            animation-delay: 2s;
          }

          .blob-3 {
            width: 200px;
            height: 200px;
            background: #f093fb;
            top: 50%;
            left: 50%;
            animation-delay: 4s;
          }
        `}
      </style>

      <div className="decorative-blob blob-1" />
      <div className="decorative-blob blob-2" />
      <div className="decorative-blob blob-3" />

      <Container size={480} className="login-container" style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <Transition mounted={mounted} transition="fade-up" duration={600} timingFunction="ease">
          {(styles) => (
            <Paper
              className="glass-card"
              p={isMobile ? 25 : 40}
              radius="xl"
              style={{
                ...styles,
                width: '100%',
              }}
            >
              <Stack spacing="xl">
                <Box className="logo-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <Box
                    style={{
                      position: 'relative',
                      padding: '15px',
                      background: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: '20px',
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    <img
                      src="/logo.jpeg"
                      alt="HM Conveniência"
                      style={{
                        height: isMobile ? '80px' : '100px',
                        borderRadius: '12px',
                        display: 'block',
                      }}
                    />
                  </Box>
                </Box>

                <Stack spacing="xs" align="center">
                  <Group spacing={8} position="center">
                    <FaStore size={24} color="#FF6B35" />
                    <Title
                      order={isMobile ? 3 : 2}
                      align="center"
                      style={{
                        fontFamily: 'Greycliff CF, sans-serif',
                        background: 'linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 800,
                        letterSpacing: '-0.5px',
                      }}
                    >
                      HM Conveniência
                    </Title>
                  </Group>
                  <Text
                    size={isMobile ? "sm" : "md"}
                    align="center"
                    style={{
                      color: 'rgba(255, 255, 255, 0.95)',
                      fontWeight: 500,
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    Sistema de Gestão Inteligente
                  </Text>
                </Stack>

                {error && (
                  <Transition mounted={!!error} transition="slide-down" duration={300}>
                    {(styles) => (
                      <Alert
                        icon={<FaExclamationCircle />}
                        title="Ops! Algo deu errado"
                        color="red"
                        radius="md"
                        withCloseButton
                        onClose={() => setError('')}
                        style={{
                          ...styles,
                          background: 'rgba(255, 107, 107, 0.15)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 107, 107, 0.3)',
                        }}
                      >
                        {error}
                      </Alert>
                    )}
                  </Transition>
                )}

                <form onSubmit={handleSubmit}>
                  <Stack spacing="lg">
                    <TextInput
                      className="input-wrapper"
                      label={
                        <Text size="sm" weight={600} style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                          Usuário
                        </Text>
                      }
                      placeholder="Digite seu usuário"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      icon={<FaUser color="#FF6B35" />}
                      radius="md"
                      size={isMobile ? "md" : "lg"}
                    />

                    <PasswordInput
                      className="input-wrapper"
                      label={
                        <Text size="sm" weight={600} style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                          Senha
                        </Text>
                      }
                      placeholder="Digite sua senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={<FaLock color="#FF6B35" />}
                      radius="md"
                      size={isMobile ? "md" : "lg"}
                    />

                    <Button
                      className="submit-button"
                      fullWidth
                      size={isMobile ? "md" : "lg"}
                      type="submit"
                      loading={loading}
                      radius="md"
                      style={{
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        marginTop: '10px',
                      }}
                    >
                      {loading ? 'Entrando...' : 'Acessar Sistema'}
                    </Button>
                  </Stack>
                </form>

                <Text
                  size="xs"
                  align="center"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginTop: '10px',
                  }}
                >
                  Desenvolvido com tecnologia de ponta
                </Text>
              </Stack>
            </Paper>
          )}
        </Transition>
      </Container>
    </Box>
  );
}

export default Login;
