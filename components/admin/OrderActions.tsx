"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { STATUS_LABELS, PAYMENT_METHODS } from "@/lib/labels";
import { field } from "./ui";

const ORDER: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELED"];

export function OrderActions({
  orderId,
  status,
  paymentMethod,
  isSite,
}: {
  orderId: string;
  status: OrderStatus;
  paymentMethod: string;
  isSite: boolean;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [method, setMethod] = useState(paymentMethod);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/vendas/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, paymentMethod: method }),
    });
    if (!res.ok) {
      setError("Não foi possível atualizar.");
      setSaving(false);
      return;
    }
    router.refresh();
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Excluir esta venda? As peças voltam para o estoque. Essa ação não pode ser desfeita.")) return;
    setSaving(true);
    await fetch(`/api/vendas/${orderId}`, { method: "DELETE" });
    router.push("/vendas");
    router.refresh();
  }

  // Vendas de balcão não passam por "enviado"/"entregue"
  const options = isSite ? ORDER : ORDER.filter((s) => s !== "SHIPPED" && s !== "DELIVERED");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={field.label}>Status</label>
        <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus)} className={field.select}>
          {options.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={field.label}>Forma de pagamento</label>
        <input list="payment-methods" value={method} onChange={(e) => setMethod(e.target.value)} className={field.input} />
        <datalist id="payment-methods">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      {nextStatus === "CANCELED" && status !== "CANCELED" && (
        <p className="text-xs text-plum">Ao cancelar, as peças voltam para o estoque.</p>
      )}
      {error && <p className={field.error}>{error}</p>}
      <button type="button" onClick={save} disabled={saving} className={field.button}>
        {saving ? "Salvando…" : "Salvar"}
      </button>
      {!isSite && (
        <button type="button" onClick={remove} disabled={saving} className="text-left text-xs text-graphite underline underline-offset-4 hover:text-ink">
          Excluir venda (registrada por engano)
        </button>
      )}
    </div>
  );
}
