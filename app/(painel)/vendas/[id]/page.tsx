import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPriceCents, formatDateTime, variantLabel, formatCep } from "@/lib/format";
import { shortId } from "@/lib/stock";
import { PageHeader, Card, StatusBadge, ChannelBadge, table } from "@/components/admin/ui";
import { OrderActions } from "@/components/admin/OrderActions";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, movements: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const isSite = order.channel === "SITE";
  const cost = order.items.reduce((s, i) => s + i.costCents * i.quantity, 0);
  const revenue = order.totalCents - order.shippingCents;
  const profit = revenue - cost;
  const hasAddress = order.street || order.city;

  return (
    <div>
      <PageHeader
        title={`Venda ${shortId(order.id)}`}
        subtitle={formatDateTime(order.createdAt)}
        action={
          <div className="flex items-center gap-2">
            <ChannelBadge channel={order.channel} />
            <StatusBadge status={order.status} />
          </div>
        }
      />
      <Link href="/vendas" className="mb-4 inline-block text-xs text-graphite underline underline-offset-4 hover:text-ink">
        ← todas as vendas
      </Link>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <Card title="Peças">
            <div className={table.wrap}>
              <table className={table.table}>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className={table.td}>
                        {i.name}
                        <p className="text-xs text-graphite">{variantLabel(i.size, i.color) || "—"}</p>
                      </td>
                      <td className={`${table.tdRight} text-graphite`}>{i.quantity} × {formatPriceCents(i.priceCents)}</td>
                      <td className={table.tdRight}>{formatPriceCents(i.quantity * i.priceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="px-4 py-3 text-sm">
              <div className="flex justify-between py-0.5 text-graphite"><dt>Subtotal</dt><dd className="tabular-nums">{formatPriceCents(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && (
                <div className="flex justify-between py-0.5 text-graphite"><dt>Desconto</dt><dd className="tabular-nums">− {formatPriceCents(order.discountCents)}</dd></div>
              )}
              {order.shippingCents > 0 && (
                <div className="flex justify-between py-0.5 text-graphite"><dt>Frete {order.shippingService && `(${order.shippingService})`}</dt><dd className="tabular-nums">{formatPriceCents(order.shippingCents)}</dd></div>
              )}
              <div className="mt-1 flex justify-between border-t border-line pt-2 font-display text-lg text-ink"><dt>Total</dt><dd className="tabular-nums">{formatPriceCents(order.totalCents)}</dd></div>
              {cost > 0 && (
                <div className="flex justify-between py-0.5 text-xs text-graphite"><dt>Lucro estimado (sem frete, menos custo das peças)</dt><dd className="tabular-nums">{formatPriceCents(profit)}</dd></div>
              )}
            </dl>
          </Card>

          <Card title="Cliente">
            <div className="px-5 py-4 text-sm text-ink">
              <p>{order.customerName}</p>
              {order.customerEmail && <p className="text-graphite">{order.customerEmail}</p>}
              {order.customerPhone && <p className="text-graphite">{order.customerPhone}</p>}
              {hasAddress && (
                <p className="mt-2 text-graphite">
                  {order.street}, {order.number}{order.complement && ` – ${order.complement}`}<br />
                  {order.neighborhood} · {order.city}/{order.state} · CEP {formatCep(order.cep)}
                </p>
              )}
              {order.note && <p className="mt-2 border-l-2 border-line pl-3 text-graphite">{order.note}</p>}
              {order.mpPaymentId && <p className="mt-2 text-xs text-graphite">Mercado Pago #{order.mpPaymentId}</p>}
            </div>
          </Card>

          {order.movements.length > 0 && (
            <Card title="Estoque">
              <ul className="px-5 py-3 text-xs text-graphite">
                {order.movements.map((m) => (
                  <li key={m.id} className="py-0.5">
                    {formatDateTime(m.createdAt)} · {m.note} ({m.quantity > 0 ? "+" : ""}{m.quantity})
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card title="Atualizar">
          <div className="p-5">
            <OrderActions orderId={order.id} status={order.status} paymentMethod={order.paymentMethod} isSite={isSite} />
          </div>
        </Card>
      </div>
    </div>
  );
}
