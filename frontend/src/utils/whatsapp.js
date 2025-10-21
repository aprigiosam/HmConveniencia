/**
 * Utilitários para compartilhamento via WhatsApp
 */

/**
 * Formata data para exibição em mensagens
 */
export const formatDateForWhatsApp = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata apenas data (sem hora)
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

/**
 * Formata valor monetário
 */
export const formatCurrency = (value) => {
  return parseFloat(value || 0).toFixed(2);
};

/**
 * Retorna label amigável para forma de pagamento
 */
export const getFormaPagamentoLabel = (forma) => {
  const labels = {
    'DINHEIRO': 'Dinheiro',
    'DEBITO': 'Cartão de Débito',
    'CREDITO': 'Cartão de Crédito',
    'PIX': 'PIX',
    'FIADO': 'Fiado'
  };
  return labels[forma] || forma;
};

/**
 * Gera mensagem de comprovante de venda para WhatsApp
 */
export const gerarMensagemComprovante = (venda) => {
  let mensagem = `*🧾 COMPROVANTE DE VENDA*\n`;
  mensagem += `*HM CONVENIÊNCIA*\n\n`;
  mensagem += `📅 Data: ${formatDateForWhatsApp(venda.created_at || new Date())}\n`;
  mensagem += `🔢 Venda Nº: #${venda.numero || venda.id || '---'}\n\n`;
  mensagem += `*📦 ITENS:*\n`;

  venda.itens?.forEach((item, index) => {
    const nome = item.produto?.nome || item.produto_nome;
    const qtd = item.quantidade;
    const preco = parseFloat(item.preco_unitario || item.produto?.preco || 0);
    const subtotal = formatCurrency(qtd * preco);
    mensagem += `${index + 1}. ${nome}\n`;
    mensagem += `   ${qtd} x R$ ${formatCurrency(preco)} = R$ ${subtotal}\n`;
  });

  mensagem += `\n*💰 TOTAL: R$ ${formatCurrency(venda.valor_total || venda.total)}*\n\n`;
  mensagem += `💳 Pagamento: ${getFormaPagamentoLabel(venda.forma_pagamento)}\n`;

  // Detalhes específicos por forma de pagamento
  if (venda.forma_pagamento === 'DINHEIRO' && venda.valor_recebido) {
    const troco = parseFloat(venda.valor_recebido) - parseFloat(venda.valor_total || venda.total || 0);
    mensagem += `💵 Recebido: R$ ${formatCurrency(venda.valor_recebido)}\n`;
    mensagem += `💸 Troco: R$ ${formatCurrency(troco)}\n`;
  }

  if (venda.forma_pagamento === 'FIADO') {
    mensagem += `👤 Cliente: ${venda.cliente?.nome || venda.cliente_nome || 'N/A'}\n`;
    if (venda.data_vencimento) {
      mensagem += `📅 Vencimento: ${formatDateOnly(venda.data_vencimento)}\n`;
    }
  }

  mensagem += `\n_Obrigado pela preferência!_\n`;
  mensagem += `_Volte sempre! 🙏_`;

  return mensagem;
};

/**
 * Gera mensagem de extrato de cliente para WhatsApp
 */
export const gerarMensagemExtrato = (cliente, contas) => {
  let mensagem = `*📊 EXTRATO DE CONTA*\n`;
  mensagem += `*HM CONVENIÊNCIA*\n\n`;
  mensagem += `👤 Cliente: *${cliente.nome}*\n`;
  mensagem += `📅 Data: ${formatDateOnly(new Date())}\n\n`;

  // Calcula total devedor
  const totalDevedor = contas.reduce((sum, conta) => {
    return sum + parseFloat(conta.total || 0);
  }, 0);

  mensagem += `*💳 DÉBITOS PENDENTES:*\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━\n`;

  if (contas.length === 0) {
    mensagem += `✅ Nenhuma pendência!\n`;
  } else {
    contas.forEach((conta, index) => {
      mensagem += `\n${index + 1}. Venda #${conta.numero || conta.id}\n`;
      mensagem += `   📅 ${formatDateOnly(conta.created_at)}\n`;

      if (conta.data_vencimento) {
        const vencimento = new Date(conta.data_vencimento);
        const hoje = new Date();
        const diasAteVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

        if (diasAteVencimento < 0) {
          mensagem += `   ⚠️ Vencido há ${Math.abs(diasAteVencimento)} dias\n`;
        } else if (diasAteVencimento === 0) {
          mensagem += `   ⚠️ Vence HOJE\n`;
        } else if (diasAteVencimento <= 3) {
          mensagem += `   ⏰ Vence em ${diasAteVencimento} dias\n`;
        } else {
          mensagem += `   📆 Vence: ${formatDateOnly(conta.data_vencimento)}\n`;
        }
      }

      mensagem += `   💰 R$ ${formatCurrency(conta.total)}\n`;
    });

    mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `*💵 TOTAL DEVEDOR: R$ ${formatCurrency(totalDevedor)}*\n`;
  }

  if (cliente.limite_credito) {
    mensagem += `\n📊 Limite de Crédito: R$ ${formatCurrency(cliente.limite_credito)}\n`;
    const disponivel = parseFloat(cliente.limite_credito) - totalDevedor;
    mensagem += `✅ Disponível: R$ ${formatCurrency(disponivel)}\n`;
  }

  mensagem += `\n_Para regularizar, entre em contato conosco._\n`;
  mensagem += `_Obrigado pela confiança! 🙏_`;

  return mensagem;
};

/**
 * Gera mensagem de cobrança para WhatsApp
 */
export const gerarMensagemCobranca = (venda, cliente) => {
  let mensagem = `*🔔 LEMBRETE DE PAGAMENTO*\n`;
  mensagem += `*HM CONVENIÊNCIA*\n\n`;
  mensagem += `Olá *${cliente.nome}*! 👋\n\n`;

  const vencimento = new Date(venda.data_vencimento);
  const hoje = new Date();
  const diasAteVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

  if (diasAteVencimento < 0) {
    mensagem += `⚠️ Identificamos que o pagamento da venda *#${venda.numero || venda.id}* está *vencido há ${Math.abs(diasAteVencimento)} dias*.\n\n`;
  } else if (diasAteVencimento === 0) {
    mensagem += `⏰ O pagamento da venda *#${venda.numero || venda.id}* *vence HOJE*.\n\n`;
  } else if (diasAteVencimento <= 3) {
    mensagem += `📅 O pagamento da venda *#${venda.numero || venda.id}* vence em *${diasAteVencimento} dias*.\n\n`;
  }

  mensagem += `*Detalhes da compra:*\n`;
  mensagem += `📅 Data: ${formatDateOnly(venda.created_at)}\n`;
  mensagem += `💰 Valor: R$ ${formatCurrency(venda.total)}\n`;
  mensagem += `📆 Vencimento: ${formatDateOnly(venda.data_vencimento)}\n\n`;

  if (venda.itens && venda.itens.length > 0) {
    mensagem += `*Itens:*\n`;
    venda.itens.forEach((item, index) => {
      const nome = item.produto?.nome || item.produto_nome;
      mensagem += `• ${nome}\n`;
    });
    mensagem += `\n`;
  }

  mensagem += `Por favor, efetue o pagamento o mais breve possível.\n\n`;
  mensagem += `_Caso já tenha pago, desconsidere esta mensagem._\n`;
  mensagem += `_Qualquer dúvida, estamos à disposição! 📞_`;

  return mensagem;
};

/**
 * Abre WhatsApp Web com mensagem e telefone
 */
export const enviarWhatsApp = (mensagem, telefone = null) => {
  // Remove caracteres não numéricos do telefone
  const telefoneFormatado = telefone ? telefone.replace(/\D/g, '') : '';

  // Monta URL do WhatsApp
  const url = telefoneFormatado
    ? `https://wa.me/55${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`
    : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  // Abre em nova aba
  window.open(url, '_blank');
};

/**
 * Hook completo para compartilhar comprovante via WhatsApp
 */
export const compartilharComprovante = (venda) => {
  const mensagem = gerarMensagemComprovante(venda);
  const telefone = venda.cliente?.telefone || venda.cliente_telefone || null;
  enviarWhatsApp(mensagem, telefone);
};

/**
 * Hook completo para compartilhar extrato via WhatsApp
 */
export const compartilharExtrato = (cliente, contas) => {
  const mensagem = gerarMensagemExtrato(cliente, contas);
  const telefone = cliente.telefone;
  enviarWhatsApp(mensagem, telefone);
};

/**
 * Hook completo para enviar cobrança via WhatsApp
 */
export const enviarCobranca = (venda, cliente) => {
  const mensagem = gerarMensagemCobranca(venda, cliente);
  const telefone = cliente.telefone;
  enviarWhatsApp(mensagem, telefone);
};
