import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { ReceiptPreview } from "./ReceiptPreview";
import { usePOSHotkeys } from "./POSHotkeys";
import { SaleReceiptModal, type VendaDetalhe } from "./SaleReceiptModal";
import { usePosStore, type PosCartItem, type PosPayment, type PosProduct } from "../../stores/posStore";
import api from "../../services/api";

type FormaPagamento = {
  id: number;
  nome: string;
  tipo: string;
};

type Loja = {
  id: number;
  nome: string;
};

const gerarNumeroVenda = () => {
  const agora = new Date();
  const data = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}${String(agora.getDate()).padStart(2, "0")}`;
  const hora = `${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}${String(agora.getSeconds()).padStart(2, "0")}`;
  const sufixo = Math.floor(Math.random() * 900 + 100);
  return `PDV-${data}${hora}-${sufixo}`;
};

const calcularPrecoUnitarioFinal = (item: PosCartItem) => {
  const quantidade = Math.max(item.quantidade, 1);
  const descontoPercentual = Math.min(Math.max(item.descontoPercentual ?? 0, 0), 100);
  const descontoPorcentagem = (item.preco * descontoPercentual) / 100;
  const descontoUnitarioAdicional = quantidade > 0 ? (item.descontoValor ?? 0) / quantidade : 0;
  const precoFinal = Math.max(item.preco - descontoPorcentagem - descontoUnitarioAdicional, 0);
  return Number(precoFinal.toFixed(2));
};

export const POSPage = () => {
  const {
    itens,
    adicionarItem,
    atualizarQuantidade,
    removerItem,
    buscarProduto,
    aplicarDescontoItem,
    definirPagamentos,
    limpar,
    totais,
  } = usePosStore();

  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<PosProduct[]>([]);
  const [pagamentos, setPagamentos] = useState<PosPayment[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<number | null>(null);
  const [carregandoReferencias, setCarregandoReferencias] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [ultimaVenda, setUltimaVenda] = useState<VendaDetalhe | null>(null);

  const totalAtual = useMemo(() => totais(), [itens, totais]);
  const valorRecebido = pagamentos.reduce((sum, item) => sum + item.valor, 0);
  const troco = Math.max(valorRecebido - totalAtual.total, 0);

  useEffect(() => {
    let ativo = true;
    const carregarReferencias = async () => {
      setCarregandoReferencias(true);
      try {
        const [formasRes, lojasRes] = await Promise.all([
          api.get("/formas-pagamento/", { params: { page_size: 100 } }),
          api.get("/lojas/", { params: { page_size: 100 } }),
        ]);

        if (!ativo) {
          return;
        }

        const formasData: FormaPagamento[] = formasRes.data.results ?? formasRes.data ?? [];
        const lojasData: Loja[] = lojasRes.data.results ?? lojasRes.data ?? [];

        setFormasPagamento(formasData);
        setLojas(lojasData);

        if (lojasData.length > 0) {
          setSelectedLoja((prev) => prev ?? lojasData[0].id);
        }
      } catch (error: any) {
        const mensagem = error?.message ?? "Falha ao carregar dados de apoio";
        toast.error(mensagem);
      } finally {
        if (ativo) {
          setCarregandoReferencias(false);
        }
      }
    };

    carregarReferencias();

    return () => {
      ativo = false;
    };
  }, []);

  usePOSHotkeys({
    onSearch: () => document.getElementById("campo-busca")?.focus(),
    onAddItem: () => {
      void handleAdicionarProduto();
    },
    onDiscount: () => {
      const primeiro = itens[0];
      if (primeiro) {
        document.getElementById(`desconto-${primeiro.sku}`)?.focus();
      }
    },
    onFinish: () => {
      void finalizarVenda();
    },
    onCancel: () => limpar(),
  });

  const handleBuscar = async () => {
    if (!busca.trim()) return;
    const resultados = await buscarProduto(busca.trim());
    setSugestoes(resultados);
  };

  const adicionarComValidacao = (produto: any) => {
    if (produto.estoque <= 0) {
      toast.error(`${produto.descricao} sem estoque disponível`);
      return;
    }

    // Verificar se já tem no carrinho
    const itemNoCarrinho = itens.find(item => item.sku === produto.sku);
    const quantidadeNoCarrinho = itemNoCarrinho ? itemNoCarrinho.quantidade : 0;

    if (quantidadeNoCarrinho >= produto.estoque) {
      toast.error(`Quantidade máxima disponível para ${produto.descricao}: ${produto.estoque}`);
      return;
    }

    adicionarItem(produto);
    toast.success(`${produto.descricao} adicionado`);
  };

  const handleAdicionarProduto = async () => {
    if (!busca.trim()) return;
    const [primeiro] = await buscarProduto(busca.trim());
    if (!primeiro) {
      toast.error("Produto não encontrado");
      return;
    }
    adicionarComValidacao(primeiro);
    setBusca("");
    setSugestoes([]);
  };

  const atualizarPagamento = (forma: FormaPagamento, rawValue: string) => {
    const parsed = rawValue === "" ? NaN : Number(rawValue);
    const normalizado = Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;

    setPagamentos((prev) => {
      const restantes = prev.filter((item) => item.formaPagamentoId !== forma.id);
      if (normalizado <= 0) {
        return restantes;
      }
      const atualizado: PosPayment = {
        formaPagamentoId: forma.id,
        nome: forma.nome,
        valor: Number(normalizado.toFixed(2)),
      };
      return [...restantes, atualizado];
    });
  };

  const finalizarVenda = async () => {
    if (!itens.length) {
      toast.error("Adicione itens ao carrinho");
      return;
    }
    if (selectedLoja === null) {
      toast.error("Selecione a loja da venda");
      return;
    }
    if (formasPagamento.length === 0) {
      toast.error("Cadastre pelo menos uma forma de pagamento");
      return;
    }
    if (valorRecebido < totalAtual.total) {
      toast.error("Pagamentos insuficientes");
      return;
    }

    const pagamentosValidos = pagamentos.filter((item) => item.valor > 0);
    if (pagamentosValidos.length === 0) {
      toast.error("Informe o valor recebido");
      return;
    }

    setFinalizando(true);

    try {
      const numeroVenda = gerarNumeroVenda();
      const itensPayload = itens.map((item: PosCartItem) => {
        const quantidade = Math.max(item.quantidade, 1);
        const precoUnitario = calcularPrecoUnitarioFinal(item);
        return {
          produto: item.id,
          quantidade,
          preco_unitario: precoUnitario,
          valor_total: Number((precoUnitario * quantidade).toFixed(2)),
        };
      });

      const payload = {
        loja: selectedLoja,
        numero_venda: numeroVenda,
        status: "FINALIZADA",
        valor_subtotal: Number(totalAtual.subtotal.toFixed(2)),
        valor_desconto: Number(totalAtual.descontos.toFixed(2)),
        valor_total: Number(totalAtual.total.toFixed(2)),
        itens: itensPayload,
        pagamentos: pagamentosValidos.map((pagamento) => ({
          forma_pagamento: pagamento.formaPagamentoId,
          valor: Number(pagamento.valor.toFixed(2)),
        })),
      };

      const { data } = await api.post("/sales/vendas/", payload);
      let vendaDetalhe: VendaDetalhe | null = null;

      if (data?.id) {
        try {
          const detalhe = await api.get(`/sales/vendas/${data.id}/`);
          vendaDetalhe = detalhe.data;
        } catch (erroDetail: any) {
          console.warn("Falha ao carregar detalhe da venda", erroDetail);
          vendaDetalhe = data;
        }
      } else {
        vendaDetalhe = data;
      }

      definirPagamentos(pagamentosValidos);
      toast.success("Venda registrada com sucesso");
      limpar();
      setPagamentos([]);
      setSugestoes([]);
      setBusca("");

      if (vendaDetalhe) {
        setUltimaVenda(vendaDetalhe);
      }
    } catch (error: any) {
      const mensagem = error?.message ?? "Falha ao finalizar a venda";
      toast.error(mensagem);
    } finally {
      setFinalizando(false);
    }
  };

  const podeFinalizar =
    itens.length > 0 &&
    selectedLoja !== null &&
    valorRecebido >= totalAtual.total &&
    !finalizando &&
    pagamentos.some((pagamento) => pagamento.valor > 0);

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Loja</label>
              <select
                className="w-full rounded border border-slate-200 px-3 py-2"
                value={selectedLoja ?? ""}
                onChange={(event) => setSelectedLoja(Number(event.target.value))}
                disabled={carregandoReferencias || lojas.length <= 1}
              >
                <option value="">Selecione a loja</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
              {lojas.length <= 1 && selectedLoja && (
                <p className="mt-1 text-xs text-slate-400">Loja selecionada automaticamente.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              id="campo-busca"
              label="Buscar produto (F2)"
              placeholder="Digite nome, SKU ou código de barras"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAdicionarProduto();
                }
              }}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleBuscar}>
                Buscar
              </Button>
              <Button onClick={() => void handleAdicionarProduto()}>Adicionar (Ctrl+Enter)</Button>
            </div>
          </div>

          {sugestoes.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="mb-2 text-xs uppercase text-slate-500">Sugestões</p>
              <ul className="space-y-1">
                {sugestoes.slice(0, 5).map((item) => (
                  <li key={item.sku} className={`flex items-center justify-between ${item.estoque <= 0 ? 'opacity-50' : ''}`}>
                    <span>
                      <strong className="font-medium text-slate-700">{item.sku}</strong> - {item.descricao}
                      <span className={`ml-2 text-xs ${item.estoque <= 0 ? 'text-red-500' : 'text-slate-500'}`}>
                        (Estoque: {item.estoque})
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => adicionarComValidacao(item)}
                      disabled={item.estoque <= 0}
                    >
                      {item.estoque <= 0 ? 'Sem estoque' : 'Adicionar'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-28">Qtde</TableHead>
                <TableHead className="w-28">Preço</TableHead>
                <TableHead className="w-24">Desc (%)</TableHead>
                <TableHead className="w-16"></TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-slate-400">
                    Nenhum item no carrinho. Use F2 para buscar produtos.
                  </TableCell>
                </TableRow>
              )}
              {itens.map((item: PosCartItem) => (
                <TableRow key={item.sku}>
                  <TableCell>
                    <div className="font-medium text-slate-800">{item.descricao}</div>
                    <div className="text-xs text-slate-400">
                      {item.sku} • Estoque: {item.estoque}
                    </div>
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min={1}
                      max={item.estoque}
                      className={`w-24 rounded border px-2 py-1 text-right ${
                        item.quantidade > item.estoque ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                      value={item.quantidade}
                      onChange={(event) => {
                        const novaQuantidade = Number(event.target.value);
                        if (novaQuantidade > item.estoque) {
                          toast.error(`Quantidade máxima para ${item.descricao}: ${item.estoque}`);
                          return;
                        }
                        atualizarQuantidade(item.sku, novaQuantidade);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {item.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell>
                    <input
                      id={`desconto-${item.sku}`}
                      type="number"
                      min={0}
                      max={100}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-right"
                      value={item.descontoPercentual}
                      onChange={(event) => aplicarDescontoItem(item.sku, Number(event.target.value))}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" onClick={() => removerItem(item.sku)}>
                      Remover
                    </Button>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {(
                      item.preco * item.quantidade -
                      ((item.preco * item.quantidade * item.descontoPercentual) / 100 + item.descontoValor)
                    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <ReceiptPreview itens={itens} totais={totalAtual} />

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-slate-800">Pagamentos</h3>
          {formasPagamento.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma forma de pagamento disponível.</p>
          ) : (
            <div className="space-y-3">
              {formasPagamento.map((forma) => {
                const pagamentoAtual = pagamentos.find((item) => item.formaPagamentoId === forma.id);
                return (
                  <div key={forma.id} className="flex items-center justify-between gap-3">
                    <Badge tone="info" className="uppercase">
                      {forma.nome}
                    </Badge>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-32 rounded border border-slate-200 px-2 py-1 text-right"
                      value={pagamentoAtual?.valor ?? ""}
                      onChange={(event) => atualizarPagamento(forma, event.target.value)}
                      disabled={finalizando}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Valor recebido</span>
              <span>{valorRecebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Troco</span>
              <span>{troco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => void finalizarVenda()}
            disabled={!podeFinalizar}
          >
            {finalizando ? "Finalizando..." : "Finalizar venda (F10)"}
          </Button>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Atalhos</p>
          <ul className="mt-2 space-y-1">
            <li>F2 buscar produto - Ctrl+Enter adicionar item</li>
            <li>F4 desconto item selecionado - F8 cancelar venda - F10 finalizar</li>
          </ul>
        </div>
      </section>

      <SaleReceiptModal venda={ultimaVenda} onClose={() => setUltimaVenda(null)} />
    </div>
  );
};
