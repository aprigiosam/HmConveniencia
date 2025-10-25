import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Container, Paper, Title, Text, TextInput, Select, Group, Button, Loader, Center, Alert } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaSave } from 'react-icons/fa';
import { createEmpresa, getEmpresas, updateEmpresa } from '../services/api';

const ambienteOptions = [
  { value: 'HOMOLOGACAO', label: 'Homologação (teste)' },
  { value: 'PRODUCAO', label: 'Produção' },
];

const emptyForm = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  email_contato: '',
  telefone_contato: '',
  ambiente: 'HOMOLOGACAO',
};

function EmpresaSetup({ onSuccess }) {
  const [form, setForm] = useState(emptyForm);
  const [empresaId, setEmpresaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const response = await getEmpresas();
        const payload = response.data?.results ?? response.data;
        const empresaExistente = Array.isArray(payload) ? payload[0] : payload;

        if (empresaExistente) {
          setEmpresaId(empresaExistente.id);
          setForm({
            razao_social: empresaExistente.razao_social || '',
            nome_fantasia: empresaExistente.nome_fantasia || '',
            cnpj: empresaExistente.cnpj || '',
            inscricao_estadual: empresaExistente.inscricao_estadual || '',
            inscricao_municipal: empresaExistente.inscricao_municipal || '',
            email_contato: empresaExistente.email_contato || '',
            telefone_contato: empresaExistente.telefone_contato || '',
            ambiente: empresaExistente.ambiente || 'HOMOLOGACAO',
          });
        }
      } catch (err) {
        console.error('Erro ao buscar empresa', err);
        setError('Não foi possível carregar os dados da empresa. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, []);

  const handleChange = (field) => (event) => {
    const value = event?.currentTarget ? event.currentTarget.value : event;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseServerError = (data) => {
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.join(', ');
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => {
          if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
          if (typeof value === 'string') return `${key}: ${value}`;
          return null;
        })
        .filter(Boolean)
        .join(' | ');
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setSaving(true);

    try {
      const payload = { ...form };
      payload.cnpj = payload.cnpj?.replace(/\D/g, '') || '';

      let response;
      if (empresaId) {
        response = await updateEmpresa(empresaId, payload);
      } else {
        response = await createEmpresa(payload);
      }

      const empresaSalva = response.data;
      localStorage.setItem('empresa', JSON.stringify(empresaSalva));
      setEmpresaId(empresaSalva.id);
      setSuccessMessage('Empresa salva com sucesso!');
      onSuccess(empresaSalva);

      // Dá um tempo para o usuário ler o aviso antes de seguir
      setTimeout(() => {
        navigate('/');
      }, 600);
    } catch (err) {
      console.error('Erro ao salvar empresa', err);
      const message =
        parseServerError(err.response?.data) ||
        err.response?.data?.detail ||
        'Não foi possível salvar os dados da empresa.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="sm" my="xl">
      <Paper shadow="md" radius="md" p="xl" withBorder>
        <Group mb="lg" spacing="xs" align="center">
          <FaBuilding size={32} color="#FF6B35" />
          <div>
            <Title order={2} style={{ color: '#FF6B35' }}>
              {empresaId ? 'Atualize os dados da sua empresa' : 'Cadastre sua empresa'}
            </Title>
            <Text c="dimmed" size="sm">
              Precisamos dessas informações para emitir notas, controlar estoque e personalizar o sistema para sua loja.
            </Text>
          </div>
        </Group>

        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert color="green" mb="md" withCloseButton onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Razão Social"
            placeholder="HM Conveniência LTDA"
            required
            value={form.razao_social}
            onChange={handleChange('razao_social')}
            mb="md"
          />

          <TextInput
            label="Nome Fantasia"
            placeholder="HM Conveniência"
            value={form.nome_fantasia}
            onChange={handleChange('nome_fantasia')}
            mb="md"
          />

          <TextInput
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            required
            value={form.cnpj}
            onChange={handleChange('cnpj')}
            mb="md"
          />

          <Group grow mb="md">
            <TextInput
              label="Inscrição Estadual"
              value={form.inscricao_estadual}
              onChange={handleChange('inscricao_estadual')}
            />
            <TextInput
              label="Inscrição Municipal"
              value={form.inscricao_municipal}
              onChange={handleChange('inscricao_municipal')}
            />
          </Group>

          <Group grow mb="md">
            <TextInput
              label="Email de Contato"
              placeholder="financeiro@hmconveniencia.com"
              value={form.email_contato}
              onChange={handleChange('email_contato')}
            />
            <TextInput
              label="Telefone"
              placeholder="(11) 99999-9999"
              value={form.telefone_contato}
              onChange={handleChange('telefone_contato')}
            />
          </Group>

          <Select
            label="Ambiente SEFAZ"
            data={ambienteOptions}
            value={form.ambiente}
            onChange={(value) => setForm((prev) => ({ ...prev, ambiente: value || 'HOMOLOGACAO' }))}
            mb="xl"
          />

          <Group justify="space-between" align="center">
            {empresaId && (
              <Button variant="subtle" onClick={() => navigate('/')} disabled={saving}>
                Voltar para o painel
              </Button>
            )}
            <Button type="submit" loading={saving} leftIcon={<FaSave />}>
              {empresaId ? 'Atualizar dados' : 'Cadastrar empresa'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}

EmpresaSetup.propTypes = {
  onSuccess: PropTypes.func,
};

EmpresaSetup.defaultProps = {
  onSuccess: () => {},
};

export default EmpresaSetup;
