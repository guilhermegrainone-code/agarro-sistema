import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPriceCents } from "@/lib/format";
import { CHANNEL_LABELS, REVENUE_STATUSES } from "@/lib/labels";
import { monthKey, startOfMonth, addMonths, monthLabel, dayKey, shortDay } from "@/lib/dates";
import { SalesChart } from "@/components/admin/SalesChart";
import { PageHeader, Stat, Card, Empty, table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : monthKey();
  const start = startOfMonth(mes);
  const end = startOfMonth(addMonths(mes, 1));
  const prevStart = startOfMonth(addMonths(mes, -1));

  const [orders, prevOrders, canceled] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: start, lt: end } },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: prevStart, lt: start } },
      select: { totalCents: true, shippingCents: true },
    }),
    prisma.order.count({ where: { status: "CANCELED", createdAt: { gte: start, lt: end } } }),
  ]);

  const revenueOf = (o: { totalCents: number; shippingCents: number }) => o.totalCents - o.shippingCents;
  const revenue = orders.reduce((s, o) => s + revenueOf(o), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + revenueOf(o), 0);
  const cost = orders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.costCents * i.quantity, 0), 0);
  const profit = revenue - cost;
  const pieces = orders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);
  const discounts = orders.reduce((s, o) => s + o.discountCents, 0);
  const shipping = orders.reduce((s, o) => s + o.shippingCents, 0);
  const avgTicket = orders.length ? Math.round(revenue / orders.length) : 0;
  const delta = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

  // Por canal
  const byChannel = new Map<string, { count: number; revenue: number; pieces: number }>();
  for (const o of orders) {
    const b = byChannel.get(o.channel) ?? { count: 0, revenue: 0, pieces: 0 };
    b.count += 1;
    b.revenue += revenueOf(o);
    b.pieces += o.items.reduce((s, i) => s + i.quantity, 0);
    byChannel.set(o.channel, b);
  }

  // Por forma de pagamento
  const byPayment = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    const key = o.paymentMethod || (o.channel === "SITE" ? "Mercado Pago" : "Não informado");
    const b = byPayment.get(key) ?? { count: 0, revenue: 0 };
    b.count += 1;
    b.revenue += revenueOf(o);
    byPayment.set(key, b);
  }

  // Por produto (qtd, receita, lucro)
  const byProduct = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
  for (const o of orders) {
    for (const i of o.items) {
      const b = byProduct.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0, profit: 0 };
      b.qty += i.quantity;
      b.revenue += i.priceCents * i.quantity;
      b.profit += (i.priceCents - i.costCents) * i.quantity;
      byProduct.set(i.productId, b);
    }
  }
  const topProducts = Array.from(byProduct.values()).sort((a, b) => b.qty - a.qty);

  // Por tamanho (ajuda a saber o que repor)
  const bySize = new Map<string, number>();
  for (const o of orders) for (const i of o.items) if (i.size) bySize.set(i.size, (bySize.get(i.size) ?? 0) + i.quantity);

  // Gráfico diário do mês
  const buckets = new Map<string, { valueCents: number; count: number }>();
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86_400_000)) {
    buckets.set(dayKey(d), { valueCents: 0, count: 0 });
  }
  for (const o of orders) {
    const b = buckets.get(dayKey(o.createdAt));
    if (b) {
      b.valueCents += revenueOf(o);
      b.count += 1;
    }
  }
  const chartData = Array.from(buckets, ([key, v]) => ({ key, label: shortDay(key), ...v }));

  const months = Array.from({ length: 12 }, (_, i) => addMonths(monthKey(), -i));

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Receita não inclui frete (é repassado à transportadora). Lucro = receita − custo das peças vendidas."
        action={
          <form className="flex items-center gap-2">
            <Link href={`/relatorios?mes=${addMonths(mes, -1)}`} className="border border-line px-2 py-1.5 text-sm text-graphite hover:border-ink hover:text-ink">‹</Link>
            <select name="mes" defaultValue={mes} className="border border-line bg-white/40 px-3 py-1.5 text-sm text-ink">
              {(months.includes(mes) ? months : [mes, ...months]).map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <button type="submit" className="border border-ink px-3 py-1.5 text-sm text-ink hover:bg-ink hover:text-paper">ver</button>
            <Link href={`/relatorios?mes=${addMonths(mes, 1)}`} className="border border-line px-2 py-1.5 text-sm text-graphite hover:border-ink hover:text-ink">›</Link>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Receita"
          value={formatPriceCents(revenue)}
          hint={delta === null ? `mês anterior: ${formatPriceCents(prevRevenue)}` : `${delta > 0 ? "+" : ""}${delta}% vs. mês anterior (${formatPriceCents(prevRevenue)})`}
        />
        <Stat label="Lucro" value={formatPriceCents(profit)} hint={cost > 0 ? `custo das peças: ${formatPriceCents(cost)} · margem ${revenue ? Math.round((profit / revenue) * 100) : 0}%` : "cadastre o custo das peças"} />
        <Stat label="Vendas" value={orders.length} hint={`${pieces} peças · ${canceled} cancelada${canceled === 1 ? "" : "s"}`} />
        <Stat label="Ticket médio" value={formatPriceCents(avgTicket)} hint={discounts > 0 ? `${formatPriceCents(discounts)} em descontos` : undefined} />
      </div>

      <div className="mt-6">
        <Card title={monthLabel(mes)}>
          <SalesChart data={chartData} title="Receita por dia" />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Por canal">
          {byChannel.size === 0 ? <Empty>Sem vendas neste mês.</Empty> : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Canal</th>
                    <th className={table.thRight}>Vendas</th>
                    <th className={table.thRight}>Peças</th>
                    <th className={table.thRight}>Receita</th>
                    <th className={table.thRight}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(byChannel).sort((a, b) => b[1].revenue - a[1].revenue).map(([ch, b]) => (
                    <tr key={ch}>
                      <td className={table.td}>{CHANNEL_LABELS[ch as keyof typeof CHANNEL_LABELS]}</td>
                      <td className={table.tdRight}>{b.count}</td>
                      <td className={table.tdRight}>{b.pieces}</td>
                      <td className={table.tdRight}>{formatPriceCents(b.revenue)}</td>
                      <td className={`${table.tdRight} text-graphite`}>{revenue ? Math.round((b.revenue / revenue) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Por forma de pagamento">
          {byPayment.size === 0 ? <Empty>Sem vendas neste mês.</Empty> : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Pagamento</th>
                    <th className={table.thRight}>Vendas</th>
                    <th className={table.thRight}>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(byPayment).sort((a, b) => b[1].revenue - a[1].revenue).map(([k, b]) => (
                    <tr key={k}>
                      <td className={table.td}>{k}</td>
                      <td className={table.tdRight}>{b.count}</td>
                      <td className={table.tdRight}>{formatPriceCents(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {shipping > 0 && <p className="px-4 py-3 text-xs text-graphite">Frete cobrado dos clientes no mês: {formatPriceCents(shipping)}</p>}
        </Card>

        <Card title="Peças mais vendidas">
          {topProducts.length === 0 ? <Empty>Sem vendas neste mês.</Empty> : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Produto</th>
                    <th className={table.thRight}>Qtd.</th>
                    <th className={table.thRight}>Receita</th>
                    <th className={table.thRight}>Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className={table.td}>{p.name}</td>
                      <td className={table.tdRight}>{p.qty}</td>
                      <td className={table.tdRight}>{formatPriceCents(p.revenue)}</td>
                      <td className={`${table.tdRight} text-graphite`}>{formatPriceCents(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Por tamanho">
          {bySize.size === 0 ? <Empty>Sem vendas neste mês.</Empty> : (
            <div className={table.wrap}>
              <table className={table.table}>
                <tbody>
                  {Array.from(bySize).sort((a, b) => b[1] - a[1]).map(([size, qty]) => (
                    <tr key={size}>
                      <td className={table.td}>{size}</td>
                      <td className={table.tdRight}>{qty} {qty === 1 ? "peça" : "peças"}</td>
                      <td className={`${table.tdRight} text-graphite`}>{pieces ? Math.round((qty / pieces) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
