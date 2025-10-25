/**
 * Sistema de mensagens bem-humoradas para o HMConveniencia
 * Porque trabalhar com inventário não precisa ser chato! 🎉
 */

// Mensagens de loading (operações em andamento)
export const loadingMessages = {
  // Inventário
  inventario: {
    buscando: '🔍 Procurando seus produtos como quem procura as chaves do carro...',
    salvando: '💾 Salvando... (não se preocupe, já salvei seu jogo antes)',
    finalizando: '🎯 Finalizando inventário... Quase lá, campeão!',
    excluindo: '🗑️ Deletando item... Ops, isso não volta mais!',
    carregando: '⏳ Carregando dados... (aproveitando pra tomar um café)',
  },

  // Open Food Facts
  openFood: {
    buscando: '🌍 Perguntando pro mundo sobre esse produto...',
    encontrando: '🎊 Eureka! Achamos algo!',
  },

  // Vendas
  vendas: {
    processando: '💰 Processando venda... Dinheiro no bolso!',
    cancelando: '❌ Cancelando venda... Mudou de ideia, né?',
    recebendo: '✅ Registrando pagamento... Show de bola!',
  },

  // Caixa
  caixa: {
    abrindo: '🔓 Abrindo caixa... Preparando pra fazer $$$',
    fechando: '🔒 Fechando caixa... Hora de contar a grana!',
    sangria: '💸 Fazendo sangria... (calma, é só tirar dinheiro)',
    suprimento: '💵 Adicionando suprimento... Reforço chegando!',
  },

  // Produtos
  produtos: {
    salvando: '📦 Salvando produto... Mais um pro estoque!',
    excluindo: '🗑️ Removendo produto... Tchau tchau!',
    atualizando: '✏️ Atualizando... Deixa eu só arrumar isso aqui',
  },

  // Lotes
  lotes: {
    criando: '📋 Criando lote... FEFO em ação!',
    conferindo: '✔️ Conferindo lote... Tudo certinho aqui!',
  },
};

// Mensagens de sucesso
export const successMessages = {
  // Inventário
  inventario: {
    itemAdicionado: [
      '🎉 Item adicionado! Mais um na lista!',
      '✅ Contagem registrada! Você é rápido, hein?',
      '👍 Anotado! Próximo!',
      '📝 Registrado com sucesso! Bora pro próximo!',
    ],
    itemRemovido: [
      '🗑️ Item removido! Como se nunca tivesse existido...',
      '💨 Poof! Sumiu!',
      '🎭 Item deletado! Ele foi pro espaço...',
    ],
    sessaoFinalizada: [
      '🎊 Inventário finalizado! Pode comemorar!',
      '🏆 Pronto! Estoque ajustado com maestria!',
      '✨ Finalizado! Você merece um café!',
      '🎯 Sucesso total! Inventário 100% completo!',
    ],
    sessaoCriada: [
      '🎬 Nova sessão criada! Vamos contar tudo!',
      '📋 Sessão iniciada! Bora trabalhar!',
    ],
    sincronizado: [
      '☁️ Sincronizado! Tudo salvo na nuvem!',
      '✅ Online novamente! Dados salvos!',
      '🔄 Sincronização completa! Ufa!',
    ],
  },

  // Open Food Facts
  openFood: {
    encontrado: [
      '🎊 Produto encontrado! A internet é maravilhosa!',
      '🌟 Achamos! Dados preenchidos automaticamente!',
      '🔥 Sucesso! Open Food Facts salvou sua vida!',
    ],
    aplicado: [
      '✨ Dados aplicados! Olha que chique!',
      '👌 Informações atualizadas! Tá bonito agora!',
    ],
  },

  // Vendas
  vendas: {
    finalizada: [
      '💰 Venda finalizada! Dinheiro no caixa!',
      '🎉 Vendeu! Cliente feliz, caixa cheio!',
      '💵 Show! Mais uma venda no bolso!',
    ],
    cancelada: [
      '❌ Venda cancelada! Acontece...',
      '🔙 Revertido! Como se não tivesse acontecido',
    ],
    paga: [
      '✅ Pagamento recebido! Tá quitado!',
      '💚 Recebido! Sem dívidas aqui!',
    ],
  },

  // Caixa
  caixa: {
    aberto: [
      '🔓 Caixa aberto! Bom dia de trabalho!',
      '💼 Caixa pronto! Vamos fazer negócio!',
    ],
    fechado: [
      '🔒 Caixa fechado! Hora de ir pra casa!',
      '💤 Fechado! Pode descansar agora!',
      '🏁 Expediente encerrado! Até amanhã!',
    ],
  },

  // Produtos
  produtos: {
    salvo: [
      '📦 Produto salvo! Mais um no catálogo!',
      '✅ Cadastrado! Pronto pra vender!',
    ],
    atualizado: [
      '✏️ Atualizado! Mudança feita!',
      '🔄 Produto atualizado! Tá novinho!',
    ],
  },
};

// Mensagens de erro (mas com bom humor)
export const errorMessages = {
  // Inventário
  inventario: {
    semQuantidade: '🤔 Psiu! Faltou a quantidade contada! (é o campo mais importante)',
    itemDuplicado: '⚠️ Opa! Esse produto já foi contado nessa sessão! Melhor editar o existente.',
    sessaoFinalizada: '🔒 Essa sessão já foi finalizada! Não dá mais pra mexer aqui.',
    sessaoNaoEncontrada: '❓ Sessão não encontrada... Será que foi pro espaço?',
    erroCarregar: '😅 Deu ruim ao carregar... Tenta de novo?',
    erroSalvar: '💔 Não consegui salvar... Internet tá boa?',
    erroFinalizar: '⚠️ Falha ao finalizar... Confere se tá tudo certo!',
    produtoNaoEncontrado: '🔍 Produto não encontrado! Tem certeza que ele existe?',
    loteInvalido: '📋 Esse lote não existe! Confere o número?',
  },

  // Open Food Facts
  openFood: {
    semCodigo: '🤷 Cadê o código de barras? Preciso dele pra buscar!',
    semTermo: '🔍 Digite algo pra eu buscar! (nome, marca, qualquer coisa)',
    naoEncontrado: '😔 Não achei nada... Tenta outro termo?',
    erroApi: '🌐 Open Food Facts tá offline... Mas você pode preencher manual!',
    nenhumResultado: '🤔 Busca não retornou nada... Tenta de outro jeito?',
  },

  // Vendas
  vendas: {
    carrinhoVazio: '🛒 Carrinho vazio! Adiciona algum produto primeiro!',
    semCliente: '👤 Pra fiado precisa escolher o cliente! (senão como cobrar?)',
    limiteExcedido: '💳 Limite de crédito do cliente estourou! Melhor conversar...',
    estoqueInsuficiente: '📦 Estoque insuficiente! Tá faltando produto!',
    produtoInativo: '⚠️ Esse produto tá inativo! Não pode vender.',
  },

  // Caixa
  caixa: {
    jaAberto: '🔓 Já tem um caixa aberto! Fecha ele primeiro.',
    naoPodeFechar: '⚠️ Não dá pra fechar agora... Confere se tá tudo certo!',
    valorInvalido: '💰 Valor inválido! Confere os números aí.',
  },

  // Geral
  geral: {
    campoObrigatorio: '⚠️ Esse campo é obrigatório! Preenche aí!',
    erroGenerico: '😅 Ops! Algo deu errado... Tenta de novo?',
    semInternet: '📶 Sem internet! Mas calma, salvamos offline!',
    erroPermissao: '🔐 Você não tem permissão pra isso!',
    sessaoExpirada: '⏰ Sua sessão expirou! Faz login de novo?',
  },
};

// Mensagens de aviso
export const warningMessages = {
  inventario: {
    diferencaGrande: '⚠️ Diferença grande detectada! Confere se tá certo mesmo?',
    semLote: '📋 Produto tem lotes mas você não selecionou nenhum!',
    categoriaInexistente: '🏷️ Essa categoria não existe! Seleciona outra ou cria depois.',
    produtoVencido: '⏰ Cuidado! Esse produto já venceu!',
    produtoVencendo: '⏳ Atenção! Esse produto vence em breve!',
  },

  vendas: {
    precoZero: '💵 Preço zerado! Tem certeza?',
    descontoAlto: '💸 Desconto muito alto! Confirma?',
  },

  caixa: {
    diferenca: '💰 Diferença no caixa! Confere os valores!',
    valorBaixo: '⚠️ Valor de abertura muito baixo!',
  },
};

// Mensagens de confirmação
export const confirmMessages = {
  inventario: {
    finalizar: '🎯 Tem certeza que quer finalizar? Depois não dá pra voltar!',
    excluirItem: '🗑️ Remover esse item da contagem?',
    excluirSessao: '❌ Deletar toda a sessão? (isso não tem volta)',
  },

  vendas: {
    cancelar: '❌ Cancelar essa venda? O estoque vai voltar!',
  },

  caixa: {
    fechar: '🔒 Fechar o caixa? Confere se os valores estão certos!',
  },

  produtos: {
    excluir: '🗑️ Deletar esse produto? (não tem ctrl+z)',
    excluirTodos: '⚠️ ATENÇÃO! Deletar TODOS os produtos? É sério mesmo?',
  },
};

// Helper para pegar mensagem aleatória de um array
export const getRandomMessage = (messages) => {
  if (Array.isArray(messages)) {
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return messages;
};

// Helper para mostrar mensagem com notificação Mantine
export const showMessage = (notifications, type, category, messageKey, customMessage) => {
  const messages = {
    loading: loadingMessages,
    success: successMessages,
    error: errorMessages,
    warning: warningMessages,
  };

  let message = customMessage;

  if (!message && messages[type] && messages[type][category]) {
    const categoryMessages = messages[type][category];
    message = categoryMessages[messageKey];

    if (Array.isArray(message)) {
      message = getRandomMessage(message);
    }
  }

  const colors = {
    loading: 'blue',
    success: 'green',
    error: 'red',
    warning: 'yellow',
  };

  const icons = {
    loading: '⏳',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  return notifications.show({
    message: message || 'Operação realizada',
    color: colors[type] || 'blue',
    icon: icons[type],
    autoClose: type === 'loading' ? false : 4000,
  });
};
