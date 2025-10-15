# 🔧 Guia de Solução de Problemas

## ❌ Erro: GET /caixa 404 (Not Found)

### Sintoma
No console do navegador aparece:
```
GET https://hmconveniencia.onrender.com/caixa 404 (Not Found)
```

### Causa
A variável de ambiente `VITE_API_URL` não está configurada no Render, fazendo o frontend tentar acessar a API na URL errada.

### Solução

1. Acesse o **Render Dashboard**
2. Vá para o seu **Static Site** (frontend)
3. Clique em **Environment**
4. Adicione a variável:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://SEU-BACKEND.onrender.com/api` (substitua SEU-BACKEND pela URL real do seu backend)
5. Salve e aguarde o **rebuild automático**
6. Teste novamente após o deploy concluir

### Como verificar se está funcionando

Abra o **DevTools** do navegador (F12) e na aba **Network**:
- ✅ Correto: `GET https://seu-backend.onrender.com/api/caixa/status/`
- ❌ Incorreto: `GET https://seu-frontend.onrender.com/caixa`

---

## ❌ Erro: CORS / Blocked by CORS policy

### Sintoma
```
Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

### Causa
O backend Django não está permitindo requisições do domínio do frontend.

### Solução

1. Verifique o arquivo `backend/hmconveniencia/settings.py`
2. Confirme que `django-cors-headers` está instalado
3. Adicione o domínio do frontend em `CORS_ALLOWED_ORIGINS`:
```python
CORS_ALLOWED_ORIGINS = [
    'https://seu-frontend.onrender.com',
]
```
4. Ou para permitir todos (apenas em desenvolvimento):
```python
CORS_ALLOW_ALL_ORIGINS = True  # ⚠️ Use com cuidado!
```

---

## ❌ Erro: 401 Unauthorized

### Sintoma
Todas as requisições retornam 401 e o usuário é redirecionado para login constantemente.

### Causa
- Token de autenticação inválido ou expirado
- Token não está sendo enviado nas requisições

### Solução

1. **Limpe o localStorage**:
   - Abra DevTools (F12)
   - Vá para **Application** > **Local Storage**
   - Delete as chaves `token` e `user`
   - Faça login novamente

2. **Verifique o token**:
   - No Django Admin, vá para **Auth Token** > **Tokens**
   - Verifique se o token existe para o usuário
   - Se não existir, crie um novo ou delete e faça login novamente

---

## ❌ Erro: Página em branco após deploy

### Sintoma
O site carrega mas mostra apenas uma página branca.

### Causa
- Build do Vite com erro
- Arquivo `_redirects` ausente (SPA routing não funciona)

### Solução

1. **Verifique os logs do build** no Render
2. Confirme que o arquivo `frontend/public/_redirects` existe:
```
/*    /index.html   200
```
3. Confirme que o **Publish Directory** está como `frontend/dist`
4. Faça um **Manual Deploy** no Render

---

## ❌ Erro: Backend não acorda (Free Tier)

### Sintoma
Primeira requisição demora 30-60 segundos para responder.

### Causa
O plano gratuito do Render coloca o serviço para "dormir" após 15 minutos de inatividade.

### Solução

**Solução implementada**: O sistema usa **cache-first** com IndexedDB:
- ✅ Dados carregam instantaneamente do cache local
- ✅ Sincronização com servidor acontece em background
- ✅ Sistema funciona offline

**Alternativa** (se precisar manter sempre ativo):
- Upgrade para plano pago do Render ($7/mês)
- Ou use um serviço de "ping" para manter o backend acordado

---

## ❌ Erro: Dados não aparecem após login

### Sintoma
Dashboard e outras páginas aparecem vazias ou sem dados.

### Causa
- Cache do IndexedDB vazio
- Backend retornando erro 500
- Dados não foram criados ainda

### Solução

1. **Abra o DevTools** (F12) > **Console**
2. Verifique se há erros vermelhos
3. Vá para **Network** e veja se as requisições estão retornando 200
4. Se retornar 500, verifique os **logs do backend no Render**
5. Se não há dados, crie alguns produtos/clientes pelo sistema

---

## ❌ Erro: npm run build falha

### Sintoma
```
ERROR: Failed to compile. Check the logs above.
```

### Solução

1. **Limpe node_modules e reinstale**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

2. **Verifique versões do Node**:
```bash
node -v  # Deve ser v18 ou superior
```

3. **Verifique se há imports inválidos** nos componentes

---

## 📞 Precisa de mais ajuda?

Se o problema persistir:
1. Verifique os **logs do Render** (tanto backend quanto frontend)
2. Abra o **DevTools** do navegador (F12) e veja o **Console** e **Network**
3. Verifique se todas as variáveis de ambiente estão configuradas corretamente
