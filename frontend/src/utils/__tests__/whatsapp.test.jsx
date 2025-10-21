import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatDateForWhatsApp,
  formatDateOnly,
  formatCurrency,
  getFormaPagamentoLabel,
  gerarMensagemComprovante,
  gerarMensagemExtrato,
  gerarMensagemCobranca,
  enviarWhatsApp,
} from '../whatsapp';

describe('whatsapp utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('formata datas completas e apenas data', () => {
    const iso = '2025-10-21T15:40:00Z';
    expect(formatDateForWhatsApp(iso)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatDateOnly(iso)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatDateForWhatsApp(null)).toBe('N/A');
    expect(formatDateOnly(undefined)).toBe('N/A');
  });

  it('formata valores e rótulos de pagamento', () => {
    expect(formatCurrency(10)).toBe('10.00');
    expect(formatCurrency()).toBe('0.00');
    expect(getFormaPagamentoLabel('DEBITO')).toBe('Cartão de Débito');
    expect(getFormaPagamentoLabel('OUTRO')).toBe('OUTRO');
  });

  it('gera comprovante com itens e troco quando em dinheiro', () => {
    const comprovante = gerarMensagemComprovante({
      numero: '123',
      created_at: '2025-10-21T12:00:00Z',
      forma_pagamento: 'DINHEIRO',
      valor_total: 20,
      valor_recebido: 30,
      itens: [
        { produto_nome: 'Refrigerante', quantidade: 2, preco_unitario: 5 },
        {
          produto: { nome: 'Salgado', preco: 5 },
          quantidade: 2,
        },
      ],
    });

    expect(comprovante).toContain('Refrigerante');
    expect(comprovante).toContain('Salgado');
    expect(comprovante).toContain('Troco');
    expect(comprovante).toContain('R$ 20.00');
  });

  it('gera extrato com total devedor e mensagens de vencimento', () => {
    const hoje = new Date().toISOString().split('T')[0];
    const contas = [
      { id: 1, total: 50, created_at: hoje, data_vencimento: hoje },
      { id: 2, total: 25, created_at: hoje },
    ];

    const extrato = gerarMensagemExtrato(
      { nome: 'Cliente XPTO', limite_credito: 200 },
      contas
    );

    expect(extrato).toContain('Cliente XPTO');
    expect(extrato).toContain('TOTAL DEVEDOR');
    expect(extrato).toContain('R$ 75.00');
  });

  it('gera cobrança incluindo itens e contexto de vencimento', () => {
    const hoje = new Date();
    const venda = {
      numero: 123,
      created_at: hoje.toISOString(),
      data_vencimento: hoje.toISOString(),
      total: 40,
      itens: [{ produto_nome: 'Chocolate' }],
    };
    const cliente = { nome: 'Fulano', telefone: '11999999999' };

    const mensagem = gerarMensagemCobranca(venda, cliente);

    expect(mensagem).toContain('LEMBRETE DE PAGAMENTO');
    expect(mensagem).toContain('Chocolate');
    expect(mensagem).toContain('Fulano');
  });

  it('abre whatsapp com telefone formatado e fallback sem numero', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    enviarWhatsApp('texto', '(11) 99999-9999');
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/5511999999999'),
      '_blank'
    );

    enviarWhatsApp('sem telefone');
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank'
    );
  });
});
