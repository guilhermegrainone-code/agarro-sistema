import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPriceCents, formatDateTime, variantLabel } from "@/lib/format";
import { REVENUE_STATUSES } from "@/lib/labels";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { dayKey, startOfDay, startOfMonth, monthKey, addDays, shortDay } from "@/lib/dates";
import { SalesChart } from "@/components/admin/SalesChart";
import { PageHeader, ButtonLink, Stat, Card, Empty, StatusBadge, ChannelBadge, StockPill, table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const now = new Date();
  const todayStart = startOfDay(dayKey(now));
  const monthStart = startOfMonth(monthKey(now));
  const chartStart = startOfDay(dayKey(addDays(now, -29)));

  const [monthOrders, chartOrders, pendingCount, lowStock, recent, productCount] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: monthStart } },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: chartStart } },
      select: { createdAt: true, totalCents: true, shippingCents: true },
    }),
    prisma.order.count({ where: { status: "PENDING", channel: "SITE" } }),
    prisma.variant.findMany({
      where: { stock: { lte: LOW_STOCK_THRESHOLD }, product: { active: true } },
      include: { product: { select: { name: true, id: true } } },
      orderBy: { stock: "asc" },
      take: 8,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { items: { select: { quantity: true } } },
    }),
    prisma.product.count({ where: { active: true } }),
  ]);

  // Receita = total sem frete (o frete é repassado à transportadora, não é ganho).
  const revenue = (o: { totalCents: number; shippingCents: number }) => o.totalCents - o.shippingCents;

  const todayOrders = monthOrders.filter((o) => o.createdAt >= todayStart);
  const todayRevenue = todayOrders.reduce((s, o) => s + revenue(o), 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + revenue(o), 0);
  const monthCost = monthOrders.reduce(
    (s, o) => s + o.items.reduce((si, i) => si + i.costCents * i.quantity, 0),
    0,
  );
  const monthProfit = monthRevenue - monthCost;
  const monthPieces = monthOrders.reduce(
    (s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0),
    0,
  );

  // Agrupa por dia (fuso da loja) para o gráfico
  const buckets = new Map<string, { valueCents: number; count: number }>();
  for (let i = 29; i >= 0; i--) buckets.set(dayKey(addDays(now, -i)), { valueCents: 0, count: 0 });
  for (const o of chartOrders) {
    const b = buckets.get(dayKey(o.createdAt));
    if (b) {
      b.valueCents += revenue(o);
      b.count += 1;
    }
  }
  const chartData = Array.from(buckets, ([key, v]) => ({ key, label: shortDay(key), ...v }));

  return (
    <div>
      <PageHeader
        title="Visão geral"
        subtitle={now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })}
        action={<ButtonLink href="/vendas/nova">+ Registrar venda</ButtonLink>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vendido hoje" value={formatPriceCents(todayRevenue)} hint={`${todayOrders.length} ${todayOrders.length === 1 ? "venda" : "vendas"}`} />
        <Stat label="Vendido no mês" value={formatPriceCents(monthRevenue)} hint={`${monthOrders.length} vendas · ${monthPieces} peças`} />
        <Stat
          label="Lucro no mês"
          value={formatPriceCents(monthProfit)}
          hint={monthCost > 0 ? `custo das peças: ${formatPriceCents(monthCost)}` : "cadastre o custo das peças para ver o lucro"}
        />
        <Stat
          label="Aguardando pagamento"
          value={pendingCount}
          hint="pedidos do site"
          tone={pendingCount > 0 ? "alert" : "default"}
        />
      </div>

      <div className="mt-6">
        <Card title="Últimos 30 dias">
          <SalesChart data={chartData} title="Receita por dia (sem frete)" />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card
          title="Últimas vendas"
          action={<Link href="/vendas" className="text-xs text-graphite underline underline-offset-4 hover:text-ink">ver todas</Link>}
        >
          {recent.length === 0 ? (
            <Empty>Nenhuma venda ainda. Registre a primeira em “Registrar venda”.</Empty>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td className={table.td}>
                        <Link href={`/vendas/${o.id}`} className="hover:underline">
                          {o.customerName}
                        </Link>
                        <p className="text-xs text-graphite">{formatDateTime(o.createdAt)}</p>
                      </td>
                      <td className={table.td}><ChannelBadge channel={o.channel} /></td>
                      <td className={table.td}><StatusBadge status={o.status} /></td>
                      <td className={table.tdRight}>{formatPriceCents(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Estoque baixo"
          action={<Link href="/estoque" className="text-xs text-graphite underline underline-offset-4 hover:text-ink">ver estoque</Link>}
        >
          {lowStock.length === 0 ? (
            <Empty>Tudo abastecido — nenhuma peça com {LOW_STOCK_THRESHOLD} unidades ou menos.</Empty>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <tbody>
                  {lowStock.map((v) => (
                    <tr key={v.id}>
                      <td className={table.td}>
                        {v.product.name}
                        <p className="text-xs text-graphite">{variantLabel(v.size, v.color)}</p>
                      </td>
                      <td className={table.tdRight}><StockPill stock={v.stock} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-5 py-3 text-xs text-graphite">{productCount} produtos publicados na loja</p>
        </Card>
      </div>
    </div>
  );
}
