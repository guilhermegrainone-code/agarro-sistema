import Link from "next/link";
import type { OrderStatus, OrderChannel, MovementType } from "@prisma/client";
import { STATUS_LABELS, CHANNEL_LABELS, MOVEMENT_LABELS } from "@/lib/labels";

/** Peças visuais do painel — todas na paleta da loja (nude + carmim, sem cantos arredondados). */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-graphite">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-plum text-paper hover:bg-ink"
      : "border border-ink text-ink hover:bg-ink hover:text-paper";
  return (
    <Link href={href} className={`inline-block px-4 py-2 text-sm ${styles}`}>
      {children}
    </Link>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "alert";
}) {
  return (
    <div className={`border p-5 ${tone === "alert" ? "border-plum bg-plum/5" : "border-line"}`}>
      <p className="text-xs uppercase tracking-[0.15em] text-graphite">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-graphite">{hint}</p>}
    </div>
  );
}

export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border border-line">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          {title && <h2 className="text-sm uppercase tracking-[0.15em] text-ink">{title}</h2>}
          {action}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-graphite">{children}</p>;
}

export const table = {
  wrap: "overflow-x-auto",
  table: "w-full text-sm",
  th: "border-b border-line px-4 py-2 text-left text-xs uppercase tracking-[0.12em] text-graphite font-normal",
  td: "border-b border-line/60 px-4 py-2.5 align-top text-ink",
  tdRight: "border-b border-line/60 px-4 py-2.5 text-right tabular-nums align-top text-ink",
  thRight: "border-b border-line px-4 py-2 text-right text-xs uppercase tracking-[0.12em] text-graphite font-normal",
};

export const field = {
  label: "mb-1 block text-xs uppercase tracking-[0.12em] text-graphite",
  input: "w-full border border-line bg-white/40 px-3 py-2 text-sm text-ink focus:border-ink",
  select: "w-full border border-line bg-white/40 px-3 py-2 text-sm text-ink focus:border-ink",
  button: "bg-plum px-5 py-2.5 text-sm text-paper hover:bg-ink disabled:opacity-50",
  buttonSecondary: "border border-ink px-5 py-2.5 text-sm text-ink hover:bg-ink hover:text-paper disabled:opacity-50",
  error: "text-sm text-red-700",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "border-graphite text-graphite",
  PAID: "border-plum bg-plum text-paper",
  SHIPPED: "border-ink text-ink",
  DELIVERED: "border-ink bg-ink text-paper",
  CANCELED: "border-line text-graphite line-through",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  return (
    <span className="inline-block whitespace-nowrap border border-line px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] text-graphite">
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

export function MovementBadge({ type }: { type: MovementType }) {
  const positive = type === "ENTRADA" || type === "DEVOLUCAO";
  const style =
    type === "VENDA"
      ? "border-plum text-plum"
      : positive
        ? "border-ink text-ink"
        : "border-graphite text-graphite";
  return (
    <span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] ${style}`}>
      {MOVEMENT_LABELS[type]}
    </span>
  );
}

export function StockPill({ stock }: { stock: number }) {
  const style =
    stock <= 0
      ? "bg-plum text-paper"
      : stock <= 2
        ? "border border-plum text-plum"
        : "border border-line text-ink";
  return <span className={`inline-block min-w-8 px-2 py-0.5 text-center text-xs tabular-nums ${style}`}>{stock}</span>;
}
