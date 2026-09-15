"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPriceCents, parsePriceToCents, variantLabel } from "@/lib/format";
import { CHANNEL_LABELS, PAYMENT_METHODS } from "@/lib/labels";
import { field } from "./ui";

export type SaleProduct = {
  id: string;
  name: string;
  priceCents: number;
  variants: { id: string; size: string; color: string; stock: number }[];
};

type Line = {
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  priceCents: number;
  stock: number;
};

const CHANNELS = (Object.keys(CHANNEL_LABELS) as (keyof typeof CHANNEL_LABELS)[]).filter((c) => c !== "SITE");

function localDateTimeNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function SaleForm({ products }: { products: SaleProduct[] }) {
  const router = useRouter();

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [variantId, setVariantId] = useState(products[0]?.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(
    products[0] ? (products[0].priceCents / 100).toFixed(2).replace(".", ",") : "",
  );

  const [lines, setLines] = useState<Line[]>([]);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("LOJA_FISICA");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [paid, setPaid] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [soldAt, setSoldAt] = useState(localDateTimeNow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const variant = product?.variants.find((v) => v.id === variantId);

  function selectProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setVariantId(p?.variants[0]?.id ?? "");
    setUnitPrice(p ? (p.priceCents / 100).toFixed(2).replace(".", ",") : "");
  }

  function addLine() {
    if (!product || !variant) return;
    const priceCents = parsePriceToCents(unitPrice);
    const qty = Math.max(1, Math.trunc(quantity));
    setLines((current) => {
      const existing = current.find((l) => l.variantId === variant.id && l.priceCents === priceCents);
      if (existing) {
        return current.map((l) => (l === existing ? { ...l, quantity: l.quantity + qty } : l));
      }
      return [
        ...current,
        {
          variantId: variant.id,
          productName: product.name,
          variantName: variantLabel(variant.size, variant.color),
          quantity: qty,
          priceCents,
          stock: variant.stock,
        },
      ];
    });
    setQuantity(1);
    setError("");
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
  const discountCents = Math.min(parsePriceToCents(discount || "0"), subtotal);
  const total = subtotal - discountCents;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      setError("Adicione pelo menos uma peça à venda.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          paymentMethod,
          paid,
          customerName,
          customerPhone,
          discountCents,
          note,
          soldAt: soldAt ? new Date(soldAt).toISOString() : undefined,
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, priceCents: l.priceCents })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/vendas/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível registrar a venda.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-6">
        <section className="border border-line p-5">
          <h2 className="mb-4 text-sm uppercase tracking-[0.15em] text-ink">Peças</h2>
          <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_1fr]">
            <div>
              <label className={field.label}>Produto</label>
              <select value={productId} onChange={(e) => selectProduct(e.target.value)} className={field.select}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={field.label}>Tamanho / cor</label>
              <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={field.select}>
                {product?.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {variantLabel(v.size, v.color)} — {v.stock} em estoque
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={field.label}>Qtd.</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={field.input}
              />
            </div>
            <div>
              <label className={field.label}>Preço un.</label>
              <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={field.input} />
            </div>
          </div>
          {variant && variant.stock < quantity && (
            <p className="mt-2 text-xs text-plum">
              Atenção: só há {variant.stock} em estoque dessa variação. A venda será registrada e o estoque ficará negativo.
            </p>
          )}
          <button type="button" onClick={addLine} disabled={!variant} className={`mt-3 ${field.buttonSecondary}`}>
            + adicionar à venda
          </button>

          <div className="mt-5 border-t border-line">
            {lines.length === 0 ? (
              <p className="py-4 text-sm text-graphite">Nenhuma peça adicionada.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-b border-line/60">
                      <td className="py-2.5 text-ink">
                        {l.productName}
                        <span className="text-graphite"> · {l.variantName}</span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-graphite">
                        {l.quantity} × {formatPriceCents(l.priceCents)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-ink">{formatPriceCents(l.quantity * l.priceCents)}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <button type="button" onClick={() => removeLine(i)} className="text-xs text-graphite underline underline-offset-4 hover:text-ink">
                          remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="border border-line p-5">
          <h2 className="mb-4 text-sm uppercase tracking-[0.15em] text-ink">Cliente (opcional)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={field.label}>Nome</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Cliente balcão" className={field.input} />
            </div>
            <div>
              <label className={field.label}>Telefone / WhatsApp</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={field.input} />
            </div>
          </div>
          <div className="mt-3">
            <label className={field.label}>Observação</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex.: cliente vai buscar sábado" className={field.input} />
          </div>
        </section>
      </div>

      <aside className="h-fit border border-line p-5 lg:sticky lg:top-6">
        <h2 className="mb-4 text-sm uppercase tracking-[0.15em] text-ink">Pagamento</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className={field.label}>Onde foi a venda</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className={field.select}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={field.label}>Forma de pagamento</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={field.select}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={field.label}>Data da venda</label>
            <input type="datetime-local" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} className={field.input} />
          </div>
          <div>
            <label className={field.label}>Desconto (R$)</label>
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0,00" className={field.input} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Pagamento já recebido
          </label>
        </div>

        <dl className="mt-5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between py-1 text-graphite">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPriceCents(subtotal)}</dd>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between py-1 text-graphite">
              <dt>Desconto</dt>
              <dd className="tabular-nums">− {formatPriceCents(discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line py-2 font-display text-xl text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPriceCents(total)}</dd>
          </div>
        </dl>

        {error && <p className={`mt-3 ${field.error}`}>{error}</p>}

        <button type="submit" disabled={saving || lines.length === 0} className={`mt-4 w-full ${field.button}`}>
          {saving ? "Registrando…" : "Registrar venda"}
        </button>
      </aside>
    </form>
  );
}
