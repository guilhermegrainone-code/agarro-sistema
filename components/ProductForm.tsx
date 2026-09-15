"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type VariantForm = { id?: string; size: string; color: string; stock: number };

type ProductFormValue = {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  costCents?: number;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  images: string[];
  active: boolean;
  variants: VariantForm[];
};

export function ProductForm({ initial }: { initial?: ProductFormValue }) {
  const router = useRouter();
  const isEditing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? (initial.priceCents / 100).toFixed(2) : "");
  const [cost, setCost] = useState(initial?.costCents ? (initial.costCents / 100).toFixed(2) : "");
  const [weightKg, setWeightKg] = useState(initial?.weightKg ?? 0.3);
  const [heightCm, setHeightCm] = useState(initial?.heightCm ?? 4);
  const [widthCm, setWidthCm] = useState(initial?.widthCm ?? 25);
  const [lengthCm, setLengthCm] = useState(initial?.lengthCm ?? 20);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [active, setActive] = useState(initial?.active ?? true);
  const [variants, setVariants] = useState<VariantForm[]>(
    initial?.variants ?? [{ size: "Único", color: "", stock: 0 }],
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setImages((current) => [...current, data.url]);
    } catch {
      setError(
        "Falha ao enviar a foto. Confira se o Blob Store está conectado ao projeto na Vercel.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function updateVariant(index: number, field: keyof VariantForm, value: string | number) {
    setVariants((current) =>
      current.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }

  function addVariant() {
    setVariants((current) => [...current, { size: "", color: "", stock: 0 }]);
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name,
      description,
      priceCents: Math.round(Number(price.replace(",", ".")) * 100),
      costCents: Math.round(Number(cost.replace(",", ".") || 0) * 100),
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      widthCm: Number(widthCm),
      lengthCm: Number(lengthCm),
      images,
      active,
      variants: variants
        .filter((v) => v.size.trim() !== "")
        .map((v) => ({ size: v.size, color: v.color, stock: Number(v.stock) })),
    };

    try {
      const res = await fetch(isEditing ? `/api/produtos/${initial!.id}` : "/api/produtos", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      router.push("/produtos");
      router.refresh();
    } catch {
      setError("Não foi possível salvar o produto.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Excluir este produto? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/produtos/${initial.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (data.archived) alert(data.message);
    router.push("/produtos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-2xl gap-6">
      <div>
        <label className="mb-1 block text-sm text-graphite">Nome do produto</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-graphite">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full border border-line px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-sm text-graphite">Preço de venda (R$)</label>
          <input
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="99,90"
            className="w-40 border border-line px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-graphite">Custo da peça (R$)</label>
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0,00"
            className="w-40 border border-line px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-graphite">Quanto você paga por unidade — usado para calcular o lucro.</p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm text-graphite">
          Peso e dimensões (usados no cálculo de frete)
        </p>
        <div className="flex gap-2">
          <div>
            <label className="mb-1 block text-xs text-graphite">Peso (kg)</label>
            <input
              type="number"
              step="0.01"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="w-24 border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-graphite">Altura (cm)</label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-24 border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-graphite">Largura (cm)</label>
            <input
              type="number"
              value={widthCm}
              onChange={(e) => setWidthCm(Number(e.target.value))}
              className="w-24 border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-graphite">Comprimento (cm)</label>
            <input
              type="number"
              value={lengthCm}
              onChange={(e) => setLengthCm(Number(e.target.value))}
              className="w-24 border border-line px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-graphite">Fotos</label>
        <div className="flex flex-wrap gap-3">
          {images.map((src) => (
            <div key={src} className="relative h-24 w-20 overflow-hidden bg-line">
              <Image src={src} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setImages((current) => current.filter((i) => i !== src))}
                className="absolute right-0 top-0 bg-ink px-1 text-xs text-paper"
              >
                x
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" onChange={handleUpload} className="mt-3 text-sm" />
        {uploading && <p className="mt-1 text-xs text-graphite">Enviando…</p>}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm text-graphite">
            Tamanhos e estoque
            {isEditing && <span className="ml-2 text-xs">(mudanças de estoque aqui viram “ajuste” no histórico)</span>}
          </label>
          <button type="button" onClick={addVariant} className="text-xs underline underline-offset-4">
            + adicionar tamanho
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {variants.map((variant, index) => (
            <div key={index} className="flex gap-2">
              <input
                placeholder="Tamanho (ex: P, M, G)"
                value={variant.size}
                onChange={(e) => updateVariant(index, "size", e.target.value)}
                className="w-32 border border-line px-3 py-2 text-sm"
              />
              <input
                placeholder="Cor (opcional)"
                value={variant.color}
                onChange={(e) => updateVariant(index, "color", e.target.value)}
                className="w-32 border border-line px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Estoque"
                value={variant.stock}
                onChange={(e) => updateVariant(index, "stock", Number(e.target.value))}
                className="w-24 border border-line px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="text-xs text-graphite underline underline-offset-4"
              >
                remover
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-graphite">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Publicado na loja
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-plum px-6 py-3 text-sm uppercase tracking-wide text-paper disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar produto"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-red-700 underline underline-offset-4"
          >
            Excluir produto
          </button>
        )}
      </div>
    </form>
  );
}
