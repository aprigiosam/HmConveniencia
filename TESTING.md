# Guia de Testes - Comércio Pro

Este documento descreve a estratégia de testes implementada no sistema Comércio Pro.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura de Testes](#estrutura-de-testes)
- [Executando Testes](#executando-testes)
- [Testes do Backend](#testes-do-backend)
- [Testes do Frontend](#testes-do-frontend)
- [Coverage](#coverage)
- [CI/CD](#cicd)
- [Boas Práticas](#boas-práticas)

## 🎯 Visão Geral

O sistema implementa uma estratégia de testes em três camadas:

1. **Testes Unitários**: Models, serviços, utils, components
2. **Testes de Integração**: APIs, endpoints, fluxos completos
3. **Testes E2E**: Fluxos críticos do usuário

### Tecnologias Utilizadas

- **Backend**: Django Test Framework + Coverage
- **Frontend**: Vitest + Testing Library + JSDOM
- **Execução**: Script automatizado + Make commands

## 🏗️ Estrutura de Testes

```
backend/
├── apps/
│   ├── catalog/tests/
│   │   ├── test_models.py
│   │   ├── test_views.py
│   │   └── test_serializers.py
│   ├── sales/tests/
│   │   ├── test_models.py
│   │   └── test_services.py
│   └── core/tests/
│       ├── test_auth.py
│       └── test_middleware.py
└── requirements.txt (coverage, psutil)

frontend/
├── src/
│   ├── components/__tests__/
│   │   └── ui/Button.test.tsx
│   ├── stores/__tests__/
│   │   ├── authStore.test.ts
│   │   └── posStore.test.ts
│   ├── services/__tests__/
│   └── test/
│       └── setup.ts
├── vitest.config.ts
└── package.json (@testing-library/*)
```

## 🚀 Executando Testes

### Comandos Rápidos (Make)

```bash
# Todos os testes
make test

# Apenas backend
make test-backend

# Apenas frontend
make test-frontend

# Com coverage
make test-coverage

# Lint
make lint
```

### Script Completo

```bash
# Execução completa
./scripts/run_tests.sh

# Com cobertura
./scripts/run_tests.sh --coverage

# Apenas uma parte
./scripts/run_tests.sh --backend-only
./scripts/run_tests.sh --frontend-only
```

### Execução Manual

#### Backend
```bash
cd backend
source venv/bin/activate
python manage.py test
coverage run manage.py test
coverage report
```

#### Frontend
```bash
cd frontend
npm test
npm run test -- --coverage
npm run lint
```

## 🐍 Testes do Backend

### Models
- Validações de dados
- Constraints de banco
- Métodos customizados
- Relacionamentos

### Views/APIs
- Autenticação e autorização
- Serialização/deserialização
- Filtros e buscas
- Códigos de status HTTP

### Serviços
- Lógica de negócio
- Integrações externas
- Cálculos complexos

### Exemplo de Teste

```python
class ProdutoModelTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Eletrônicos")
        self.fornecedor = Fornecedor.objects.create(
            cnpj_cpf="12.345.678/0001-90",
            nome="Fornecedor Tech"
        )

    def test_criar_produto_completo(self):
        produto = Produto.objects.create(
            sku="PHONE001",
            nome="Smartphone",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("500.00"),
            preco_venda=Decimal("800.00")
        )
        self.assertEqual(produto.nome, "Smartphone")
```

## ⚛️ Testes do Frontend

### Components
- Renderização
- Props e estado
- Eventos de usuário
- Acessibilidade

### Stores (Zustand)
- Estado inicial
- Ações e mutações
- Persistência
- Side effects

### Services
- Chamadas HTTP
- Tratamento de erros
- Transformação de dados

### Exemplo de Teste

```typescript
describe('Button Component', () => {
  it('renders with children', () => {
    render(<Button>Test Button</Button>)
    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## 📊 Coverage

### Metas de Cobertura

- **Backend**: > 80%
- **Frontend**: > 75%
- **Funcionalidades críticas**: > 95%

### Relatórios

```bash
# Backend
coverage html
# Arquivo: backend/htmlcov/index.html

# Frontend
npm run test -- --coverage
# Arquivo: frontend/coverage/index.html
```

### Exclusões de Coverage

- Arquivos de configuração
- Migrations
- Código de setup/teardown
- Mocks e fixtures

## 🔄 CI/CD

### Pipeline Sugerido

```yaml
# .github/workflows/tests.yml (exemplo)
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup
        run: |
          chmod +x scripts/run_tests.sh
      - name: Run Tests
        run: ./scripts/run_tests.sh --coverage
      - name: Upload Coverage
        uses: codecov/codecov-action@v1
```

### Hooks Git

```bash
# .git/hooks/pre-commit
#!/bin/bash
make lint
./scripts/run_tests.sh --backend-only
```

## 📋 Boas Práticas

### Nomenclatura
- **Testes**: `test_should_do_something_when_condition`
- **Classes**: `SomethingModelTests`, `SomethingViewTests`
- **Fixtures**: `create_user`, `mock_product`

### Organização
- Um arquivo de teste por module/component
- Setup comum no `setUp()` ou fixtures
- Testes independentes e isolados

### Performance
- Use `--keepdb` para testes Django
- Mocks para dependências externas
- Parallelização quando possível

### Dados de Teste
- Factories para objetos complexos
- Fixtures mínimas necessárias
- Dados realistas mas não sensíveis

## 🐛 Debug de Testes

### Comandos Úteis

```bash
# Teste específico
python manage.py test apps.catalog.tests.test_models.ProdutoModelTests.test_criar_produto

# Com debug
python manage.py test --debug-mode

# Frontend com debug
npm test -- --reporter=verbose

# Watch mode
npm test -- --watch
```

### Logs

```bash
# Backend
tail -f backend/logs/django.log

# Frontend
console.log nos testes (removidos antes do commit)
```

## 📝 Checklist de Teste

### Novo Modelo
- [ ] Validações
- [ ] Relacionamentos
- [ ] Métodos customizados
- [ ] Constraints únicos

### Nova API
- [ ] CRUD completo
- [ ] Autenticação
- [ ] Validação de dados
- [ ] Códigos de status
- [ ] Filtros e paginação

### Novo Component
- [ ] Renderização
- [ ] Props obrigatórias
- [ ] Estados diferentes
- [ ] Eventos de usuário
- [ ] Acessibilidade

### Nova Feature
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação atualizada
- [ ] Coverage > meta

## 🔗 Links Úteis

- [Django Testing](https://docs.djangoproject.com/en/stable/topics/testing/)
- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Coverage.py](https://coverage.readthedocs.io/)

---

💡 **Dica**: Execute `make test` antes de cada commit para garantir que nada foi quebrado!