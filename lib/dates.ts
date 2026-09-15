/**
 * Datas no fuso da loja (Brasil). O servidor na Vercel roda em UTC, então
 * "hoje" e "este mês" precisam ser calculados explicitamente em America/Sao_Paulo.
 */
const TZ = "America/Sao_Paulo";
const OFFSET = "-03:00"; // Brasil não tem horário de verão desde 2019

/** "2026-09-15" no fuso da loja. */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "2026-09" no fuso da loja. */
export function monthKey(date: Date = new Date()): string {
  return dayKey(date).slice(0, 7);
}

export function startOfDay(key: string): Date {
  return new Date(`${key}T00:00:00${OFFSET}`);
}

export function startOfMonth(key: string): Date {
  return new Date(`${key}-01T00:00:00${OFFSET}`);
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86_400_000);
}

/** "setembro de 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "15/09" a partir de "2026-09-15" */
export function shortDay(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}
