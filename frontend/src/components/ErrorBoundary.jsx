import { Component } from 'react';
import { Container, Title, Text, Button, Stack, Paper, Alert } from '@mantine/core';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para mostrar fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log do erro para serviço de monitoramento (ex: Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Aqui você pode enviar para um serviço de monitoramento:
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Recarrega a página
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI quando há erro
      return (
        <Container size="sm" style={{ marginTop: '100px' }}>
          <Paper p="xl" radius="md" withBorder shadow="lg">
            <Stack gap="lg" align="center">
              <div style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                padding: '30px',
                borderRadius: '50%',
                display: 'inline-flex',
              }}>
                <FaExclamationTriangle size={60} color="white" />
              </div>

              <div style={{ textAlign: 'center' }}>
                <Title order={2} mb="sm">
                  Ops! Algo deu errado
                </Title>
                <Text c="dimmed" size="lg">
                  Encontramos um erro inesperado. Não se preocupe, seus dados estão seguros.
                </Text>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert
                  icon={<FaExclamationTriangle />}
                  title="Detalhes do Erro (apenas em desenvolvimento)"
                  color="red"
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  <Text size="sm" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.errorInfo && (
                    <details style={{ marginTop: '10px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        Stack Trace
                      </summary>
                      <pre style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto',
                      }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </Alert>
              )}

              <Stack gap="sm" style={{ width: '100%' }}>
                <Button
                  size="lg"
                  leftSection={<FaRedo />}
                  onClick={this.handleReset}
                  fullWidth
                >
                  Voltar para a Página Inicial
                </Button>

                <Button
                  size="md"
                  variant="light"
                  onClick={() => window.location.reload()}
                  fullWidth
                >
                  Recarregar Página
                </Button>
              </Stack>

              <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
                Se o problema persistir, entre em contato com o suporte.
              </Text>
            </Stack>
          </Paper>
        </Container>
      );
    }

    // Renderiza children normalmente quando não há erro
    return this.props.children;
  }
}

export default ErrorBoundary;
