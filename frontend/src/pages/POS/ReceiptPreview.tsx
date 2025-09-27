import type { FC } from "react";
import type { PosCartItem, Totals } from "../../stores/posStore";

export const ReceiptPreview: FC<{ itens: PosCartItem[]; totais: Totals }> = ({ itens, totais }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
    <h3 className="mb-3 text-base font-semibold text-slate-800">Resumo</h3>
    <div className="space-y-2">
      {itens.map((item) => (
        <div key={item.sku} className="flex justify-between">
          <span>
            {item.descricao}
            <span className="ml-2 text-xs text-slate-400">
              {item.quantidade} x {item.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </span>
          <span>{(item.preco * item.quantidade).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
      ))}
    </div>
    <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-500">Subtotal</dt>
        <dd>{totais.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-500">Descontos</dt>
        <dd>-{totais.descontos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd>
      </div>
      <div className="flex justify-between text-base font-semibold text-slate-900">
        <dt>Total</dt>
        <dd>{totais.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd>
      </div>
    </dl>
  </div>
);
