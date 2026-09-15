export function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "99,90" | "99.90" | "R$ 99,90" -> 9990 */
export function parsePriceToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Nome da variação para exibição: "M · Carmim" ou só "M". */
export function variantLabel(size: string, color: string): string {
  return [size, color].filter(Boolean).join(" · ");
}
