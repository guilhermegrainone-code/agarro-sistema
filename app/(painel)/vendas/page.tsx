import Link from "next/link";
import type { OrderChannel, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPriceCents, formatDateTime } from "@/lib/format";
import { CHANNEL_LABELS, STATUS_LABELS } from "@/lib/labels";
import { monthKey, startOfMonth, addMonths, monthLabel } from "@/lib/dates";
import { PageHeader, ButtonLink, Card, Empty, StatusBadge, ChannelBadge, table, field } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Search = { canal?: string; status?: string; mes?: string; q?: string };

export default async function SalesPage({ searchParams }: { searchParams: Search }) {
  const canal = searchParams.canal as OrderChannel | undefined;
  const status = searchParams.status as OrderStatus | undefined;
  const mes = searchParams.mes ?? "";
  const q = searchParams.q?.trim() ?? "";

  const where: Prisma.OrderWhereInput = {};
  if (canal && canal in CHANNEL_LABELS) where.channel = canal;
  if (status && status in STATUS_LABELS) where.status = status;
  if (/^\d{4}-\d{2}$/.test(mes)) {
    where.createdAt = { gte: startOfMonth(mes), lt: startOfMonth(addMonths(mes, 1)) };
  }
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q } },
      { items: { some: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: { select: { name: true, quantity: true, size: true, color: true } } },
  });

  const totalCents = orders
    .filter((o) => o.status !== "PENDING" && o.status !== "CANCELED")
    .reduce((s, o) => s + o.totalCents, 0);

  // Últimos 12 meses para o filtro
  const months = Array.from({ length: 12 }, (_, i) => addMonths(monthKey(), -i));

  return (
    <div>
      <PageHeader
        title="Vendas"
        subtitle="Pedidos do site entram sozinhos; vendas da loja física, WhatsApp e Instagram você registra aqui."
        action={<ButtonLink href="/vendas/nova">+ Registrar venda</ButtonLink>}
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
        <select name="canal" defaultValue={canal ?? ""} className={field.select}>
          <option value="">Todos os canais</option>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className={field.select}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="mes" defaultValue={mes} className={field.select}>
          <option value="">Qualquer data</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Buscar por cliente ou peça" className={field.input} />
        <div className="flex gap-2">
          <button type="submit" className={field.buttonSecondary}>Filtrar</button>
          {(canal || status || mes || q) && (
            <Link href="/vendas" className="self-center text-xs text-graphite underline underline-offset-4">limpar</Link>
          )}
        </div>
      </form>

      <Card
        title={`${orders.length} ${orders.length === 1 ? "venda" : "vendas"}`}
        action={<span className="text-sm text-ink">Total recebido: <strong className="font-display">{formatPriceCents(totalCents)}</strong></span>}
      >
        {orders.length === 0 ? (
          <Empty>Nenhuma venda encontrada com esses filtros.</Empty>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Data</th>
                  <th className={table.th}>Cliente</th>
                  <th className={table.th}>Peças</th>
                  <th className={table.th}>Canal</th>
                  <th className={table.th}>Pagamento</th>
                  <th className={table.th}>Status</th>
                  <th className={table.thRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const pieces = o.items.reduce((s, i) => s + i.quantity, 0);
                  const summary = o.items
                    .slice(0, 2)
                    .map((i) => `${i.quantity}× ${i.name}${i.size ? ` ${i.size}` : ""}`)
                    .join(", ");
                  return (
                    <tr key={o.id} className="hover:bg-line/30">
                      <td className={`${table.td} whitespace-nowrap`}>
                        <Link href={`/vendas/${o.id}`} className="hover:underline">{formatDateTime(o.createdAt)}</Link>
                      </td>
                      <td className={table.td}>
                        <Link href={`/vendas/${o.id}`} className="hover:underline">{o.customerName}</Link>
                      </td>
                      <td className={table.td}>
                        <span className="text-graphite">{pieces} {pieces === 1 ? "peça" : "peças"}</span>
                        <p className="text-xs text-graphite">{summary}{o.items.length > 2 ? "…" : ""}</p>
                      </td>
                      <td className={table.td}><ChannelBadge channel={o.channel} /></td>
                      <td className={`${table.td} text-graphite`}>{o.paymentMethod || (o.channel === "SITE" ? "Mercado Pago" : "—")}</td>
                      <td className={table.td}><StatusBadge status={o.status} /></td>
                      <td className={table.tdRight}>{formatPriceCents(o.totalCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
