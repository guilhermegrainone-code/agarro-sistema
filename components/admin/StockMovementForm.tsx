"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { variantLabel } from "@/lib/format";
import { field } from "./ui";

export type StockProduct = {
  id: string;
  name: string;
  variants: { id: string; size: string; color: string; stock: number }[];
};

const TYPES = [
  { value: "ENTRADA", label: "Entrada (chegou peça)" },
  { value: "SAIDA", label: "Saída (perda, brinde, uso próprio)" },
  { value: "AJUSTE", label: "Ajuste (acertar contagem)" },
] as const;

export function StockMovementForm({
  products,
  initialVariantId,
}: {
  products: StockProduct[];
  initialVariantId?: string;
}) {
  const router = useRouter();
  const initialProduct = products.find((p) => p.variants.some((v) => v.id === initialVariantId)) ?? products[0];

  const [productId, setProductId] = useState(initialProduct?.id ?? "");
  const [variantId, setVariantId] = useState(initialVariantId ?? initialProduct?.variants[0]?.id ?? "");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("ENTRADA");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const variant = product?.variants.find((v) => v.id === variantId);

  function selectProduct(id: string) {
    setProductId(id);
    setVariantId(products.find((p) => p.id === id)?.variants[0]?.id ?? "");
  }

  // Para AJUSTE o usuário informa o saldo final; o delta é calculado aqui.
  const qtyNumber = Math.trunc(Number(quantity));
  const delta = type === "AJUSTE" && variant ? qtyNumber - variant.stock : qtyNumber;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!variant || !Number.isFinite(qtyNumber)) return;
    if (type !== "AJUSTE" && qtyNumber <= 0) {
      setError("Informe uma quantidade maior que zero.");
      return;
    }
    if (type === "AJUSTE" && delta === 0) {
      setError("O saldo informado é igual ao atual.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, type, quantity: type === "AJUSTE" ? delta : qtyNumber, note }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível registrar.");
      return;
    }
    setSuccess(`Registrado: ${product?.name} ${variantLabel(variant.size, variant.color)} agora tem ${variant.stock + delta} un.`);
    setQuantity("");
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_2fr_1fr_2fr_auto]">
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
            <option key={v.id} value={v.id}>{variantLabel(v.size, v.color)} — {v.stock} un.</option>
          ))}
        </select>
      </div>
      <div>
        <label className={field.label}>Tipo</label>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={field.select}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={field.label}>{type === "AJUSTE" ? "Saldo real" : "Qtd."}</label>
        <input
          type="number"
          min={0}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={type === "AJUSTE" ? String(variant?.stock ?? 0) : "0"}
          className={field.input}
        />
      </div>
      <div>
        <label className={field.label}>Motivo (opcional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex.: reposição fornecedor" className={field.input} />
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={saving || !variant} className={`w-full ${field.button}`}>
          {saving ? "…" : "Registrar"}
        </button>
      </div>
      {type === "AJUSTE" && variant && quantity !== "" && delta !== 0 && (
        <p className="text-xs text-graphite sm:col-span-2 lg:col-span-6">
          Saldo atual {variant.stock} → {qtyNumber} ({delta > 0 ? "+" : ""}{delta})
        </p>
      )}
      {error && <p className={`${field.error} sm:col-span-2 lg:col-span-6`}>{error}</p>}
      {success && <p className="text-sm text-ink sm:col-span-2 lg:col-span-6">{success}</p>}
    </form>
  );
}
