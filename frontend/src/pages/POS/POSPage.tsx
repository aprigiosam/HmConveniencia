import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { ReceiptPreview } from "./ReceiptPreview";
import { usePOSHotkeys } from "./POSHotkeys";
import { usePosStore, type PosCartItem, type PosPayment, type PosProduct } from "../../stores/posStore";

const meios: Array<PosPayment["meio"]> = ["dinheiro", "cartao", "pix"];

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

  const totalAtual = useMemo(() => totais(), [itens, totais]);
  const valorRecebido = pagamentos.reduce((sum, item) => sum + item.valor, 0);
  const troco = Math.max(valorRecebido - totalAtual.total, 0);

  usePOSHotkeys({
    onSearch: () => document.getElementById("campo-busca")?.focus(),
    onAddItem: () => handleAdicionarProduto(),
    onDiscount: () => {
      const primeiro = itens[0];
      if (primeiro) {
        document.getElementById(`desconto-${primeiro.sku}`)?.focus();
      }
    },
    onFinish: () => finalizarVenda(),
    onCancel: () => limpar(),
  });

  const handleBuscar = async () => {
    if (!busca.trim()) return;
    const resultados = await buscarProduto(busca.trim());
    setSugestoes(resultados);
  };

  const handleAdicionarProduto = async () => {
    if (!busca.trim()) return;
    const [primeiro] = await buscarProduto(busca.trim());
    if (!primeiro) {
      toast.error("Produto nao encontrado");
      return;
    }
    adicionarItem(primeiro);
    toast.success(`${primeiro.descricao} adicionado`);
    setBusca("");
    setSugestoes([]);
  };

  const atualizarPagamento = (meio: PosPayment["meio"], valor: number) => {
    setPagamentos((prev) => {
      const existente = prev.find((item) => item.meio === meio);
      if (existente) {
        return prev.map((item) => (item.meio === meio ? { ...item, valor } : item));
      }
      return [...prev, { meio, valor }];
    });
  };

  const finalizarVenda = () => {
    if (!itens.length) {
      toast.error("Adicione itens ao carrinho");
      return;
    }
    if (valorRecebido < totalAtual.total) {
      toast.error("Pagamentos insuficientes");
      return;
    }
    definirPagamentos(pagamentos);
    toast.success("Venda concluida");
    limpar();
    setPagamentos([]);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-end gap-3">
            <Input
              id="campo-busca"
              label="Buscar produto (F2)"
              placeholder="Digite nome, SKU ou codigo de barras"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdicionarProduto();
                }
              }}
            />
            <div className="flex gap-2 pb-1">
              <Button variant="secondary" onClick={handleBuscar}>
                Buscar
              </Button>
              <Button onClick={handleAdicionarProduto}>Adicionar (Ctrl+Enter)</Button>
            </div>
          </div>
          {sugestoes.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="mb-2 text-xs uppercase text-slate-500">Sugestoes</p>
              <ul className="space-y-1">
                {sugestoes.slice(0, 5).map((item) => (
                  <li key={item.sku} className="flex items-center justify-between">
                    <span>
                      <strong className="font-medium text-slate-700">{item.sku}</strong> - {item.descricao}
                    </span>
                    <Button variant="ghost" onClick={() => adicionarItem(item)}>
                      Adicionar
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
                <TableHead className="w-28">Preco</TableHead>
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
                    <div className="text-xs text-slate-400">{item.sku}</div>
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-right"
                      value={item.quantidade}
                      onChange={(event) => atualizarQuantidade(item.sku, Number(event.target.value))}
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
          <div className="space-y-3">
            {meios.map((meio) => (
              <div key={meio} className="flex items-center justify-between gap-3">
                <Badge tone="info" className="uppercase">{meio}</Badge>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-32 rounded border border-slate-200 px-2 py-1 text-right"
                  value={pagamentos.find((item) => item.meio === meio)?.valor ?? ""}
                  onChange={(event) => atualizarPagamento(meio, Number(event.target.value))}
                />
              </div>
            ))}
          </div>
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
          <Button className="mt-4 w-full" onClick={finalizarVenda}>
            Finalizar venda (F10)
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
    </div>
  );
};
