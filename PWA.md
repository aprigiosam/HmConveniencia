# PWA - Progressive Web App

## O que foi implementado

O HMConveniencia agora é um **PWA (Progressive Web App)** completo com suporte offline-first!

### ✨ Funcionalidades

#### 1. Funciona Offline
- ✅ Registra vendas instantaneamente no celular (sem delay)
- ✅ Armazena vendas localmente quando offline
- ✅ Sincroniza automaticamente quando online
- ✅ Cacheia produtos e clientes para uso offline

#### 2. Instalável como App
- ✅ Pode ser instalado na tela inicial do celular
- ✅ Funciona como app nativo (sem barra do navegador)
- ✅ Ícone próprio na home do celular
- ✅ Splash screen personalizada

#### 3. Sincronização Inteligente
- ✅ Tenta enviar vendas imediatamente ao servidor
- ✅ Se backend dormiu ou está offline, salva localmente
- ✅ Sincroniza automaticamente em background a cada 30s
- ✅ Mostra status de vendas pendentes
- ✅ Permite sincronização manual

## Como funciona

### Estratégia Offline-First

**Fluxo de uma venda:**

```
1. Cliente chega → Caixa registra venda
2. Sistema salva localmente (INSTANTÂNEO)
3. Tenta enviar para servidor em background
   ├─ Sucesso? → Marca como sincronizado
   └─ Falhou? → Mantém na fila, tenta depois
```

**Backend pode dormir o quanto quiser - não afeta o uso!**

### Componentes Principais

#### Service Worker (`/public/sw.js`)
- Intercepta requisições de rede
- Cacheia arquivos estáticos (HTML, CSS, JS)
- Serve conteúdo do cache quando offline
- Sincroniza dados em background

#### IndexedDB (`/src/utils/db.js`)
- Armazena vendas pendentes de sincronização
- Cacheia produtos e clientes
- Não tem limite de tamanho (vs localStorage: 5MB)

#### Sync Manager (`/src/utils/syncManager.js`)
- Gerencia fila de sincronização
- Tenta enviar vendas pendentes
- Notifica usuário sobre status

#### Sync Status Component (`/src/components/SyncStatus.jsx`)
- Mostra status da conexão (online/offline)
- Exibe quantas vendas estão pendentes
- Permite sincronização manual
- Feedback visual para o usuário

## Testando o PWA

### No Computador

1. Inicie o frontend: `cd frontend && npm run dev`
2. Abra DevTools → Application → Service Workers
3. Marque "Offline" para simular sem internet
4. Registre algumas vendas - elas ficam na fila
5. Desmarque "Offline" - vendas são sincronizadas

### No Celular (Produção)

1. Acesse o site pelo celular
2. Chrome/Edge: Menu → "Instalar app"
3. iPhone Safari: Compartilhar → "Adicionar à Tela Inicial"
4. Use como app nativo!

**Teste offline:**
- Ative modo avião
- Registre vendas normalmente
- Desative modo avião
- Vendas são sincronizadas automaticamente

## Ícones do PWA

### Gerando Ícones

Os ícones devem estar em `/frontend/public/`:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

**Opções para criar:**

#### 1. Online (Mais fácil)
- Acesse https://www.favicon-generator.org/
- Faça upload de uma logo (ex: 🏪 emoji como imagem)
- Download icon-192.png e icon-512.png
- Coloque em `/frontend/public/`

#### 2. Canva
- Crie design 512x512px
- Desenhe logo da loja
- Exporte como PNG
- Redimensione uma cópia para 192x192

#### 3. GIMP/Photoshop
- Crie imagem 512x512px
- Adicione logo/texto
- Salve como PNG

### Placeholder Temporário

Por enquanto, o PWA funcionará mesmo sem ícones. Os browsers usarão ícone padrão.

Para gerar ícones placeholder rapidamente:

```bash
cd frontend/public

# Usando ImageMagick (se instalado)
convert -size 192x192 xc:"#007bff" -gravity center -pointsize 72 -fill white -annotate +0+0 "HM" icon-192.png
convert -size 512x512 xc:"#007bff" -gravity center -pointsize 200 -fill white -annotate +0+0 "HM" icon-512.png
```

## Como Instalar no Celular

### Android (Chrome)

1. Abra o site no Chrome
2. Aparecerá banner "Adicionar à tela inicial"
3. Ou: Menu (⋮) → "Instalar app"
4. Pronto! Ícone na home screen

### iPhone (Safari)

1. Abra o site no Safari
2. Toque no botão "Compartilhar" (quadrado com seta)
3. Role e toque em "Adicionar à Tela de Início"
4. Confirme
5. Pronto! Ícone na home screen

## Benefícios vs Problemas Resolvidos

| Problema Anterior | Solução PWA |
|------------------|-------------|
| Backend dorme 15min → 40s delay | Vendas instantâneas offline |
| Cliente na fila esperando | Zero espera |
| Sem internet = sem vendas | Funciona 100% offline |
| Precisa abrir navegador | Ícone direto na home |
| Plano pago $7/mês obrigatório | Plano gratuito funciona perfeitamente |

## Monitoramento

### Ver Vendas Pendentes

No DevTools → Application → IndexedDB → HMConvenienciaDB → vendas_pendentes

### Limpar Cache

```javascript
// No console do navegador
await caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
await indexedDB.deleteDatabase('HMConvenienciaDB')
location.reload()
```

### Status de Sincronização

O componente `<SyncStatus />` mostra em tempo real:
- Conexão (online/offline)
- Vendas pendentes
- Status de sincronização
- Última sincronização

## Notas Importantes

1. **Service Worker só funciona em HTTPS** (ou localhost)
   - Em produção no Render: ✅ HTTPS automático
   - Em desenvolvimento: ✅ localhost funciona

2. **Cache é persistente**
   - Produtos/clientes ficam disponíveis offline
   - Atualiza quando online
   - Não expira automaticamente

3. **Sincronização é resiliente**
   - Tenta a cada 30 segundos
   - Tenta quando ficar online
   - Tenta após recarregar página
   - Mostra erros de validação

4. **Armazenamento Local**
   - Limite: depende do navegador (~50MB+)
   - Muito maior que localStorage (5MB)
   - Dados persistem até ser limpo

## Próximos Passos

- [ ] Gerar ícones personalizados
- [ ] Testar em dispositivos reais
- [ ] Adicionar notificações push (futuro)
- [ ] Implementar Background Sync API (futuro)
