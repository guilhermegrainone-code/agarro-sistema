import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime, variantLabel } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { PageHeader, Card, Empty, StockPill, MovementBadge, table, field } from "@/components/admin/ui";
import { StockMovementForm } from "@/components/admin/StockMovementForm";

export const dynamic = "force-dynamic";

type Search = { q?: string; baixo?: string; variante?: string };

export default async function StockPage({ searchParams }: { searchParams: Search }) {
  const q = searchParams.q?.trim() ?? "";
  const onlyLow = searchParams.baixo === "1";

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        active: true,
        variants: { select: { id: true, size: true, color: true, stock: true }, orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
    }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { variant: { include: { product: { select: { name: true } } } } },
    }),
  ]);

  const rows = products
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .map((p) => ({
      ...p,
      variants: onlyLow ? p.variants.filter((v) => v.stock <= LOW_STOCK_THRESHOLD) : p.variants,
    }))
    .filter((p) => p.variants.length > 0);

  const totalPieces = products.reduce((s, p) => s + p.variants.reduce((sv, v) => sv + Math.max(0, v.stock), 0), 0);
  const lowCount = products.reduce((s, p) => s + p.variants.filter((v) => v.stock <= LOW_STOCK_THRESHOLD).length, 0);

  return (
    <div>
      <PageHeader title="Estoque" subtitle={`${totalPieces} peças em estoque · ${lowCount} ${lowCount === 1 ? "variação" : "variações"} com ${LOW_STOCK_THRESHOLD} un. ou menos`} />

      <Card title="Entrada / saída">
        <StockMovementForm products={products.filter((p) => p.variants.length > 0)} initialVariantId={searchParams.variante} />
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card
          title="Saldo por peça"
          action={
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="Buscar produto" className="border border-line bg-white/40 px-2 py-1 text-xs" />
              <label className="flex items-center gap-1 text-xs text-graphite">
                <input type="checkbox" name="baixo" value="1" defaultChecked={onlyLow} />
                só baixos
              </label>
              <button type="submit" className="border border-ink px-2 py-1 text-xs text-ink hover:bg-ink hover:text-paper">ok</button>
            </form>
          }
        >
          {rows.length === 0 ? (
            <Empty>Nenhuma peça encontrada.</Empty>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Produto</th>
                    <th className={table.th}>Tamanho / cor</th>
                    <th className={table.thRight}>Saldo</th>
                    <th className={table.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) =>
                    p.variants.map((v, i) => (
                      <tr key={v.id} className={i === 0 ? "border-t border-line" : ""}>
                        <td className={table.td}>
                          {i === 0 && (
                            <Link href={`/produtos/${p.id}`} className="hover:underline">
                              {p.name}{!p.active && <span className="ml-1 text-xs text-graphite">(despublicado)</span>}
                            </Link>
                          )}
                        </td>
                        <td className={`${table.td} text-graphite`}>{variantLabel(v.size, v.color)}</td>
                        <td className={table.tdRight}><StockPill stock={v.stock} /></td>
                        <td className={`${table.td} text-right`}>
                          <Link href={`/estoque?variante=${v.id}`} className="text-xs text-graphite underline underline-offset-4 hover:text-ink">
                            movimentar
                          </Link>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Últimas movimentações">
          {movements.length === 0 ? (
            <Empty>Nenhuma movimentação registrada ainda.</Empty>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className={table.td}>
                        {m.variant.product.name}
                        <span className="text-graphite"> · {variantLabel(m.variant.size, m.variant.color)}</span>
                        <p className="text-xs text-graphite">
                          {formatDateTime(m.createdAt)}{m.note && ` · ${m.note}`}
                        </p>
                      </td>
                      <td className={table.td}>
                        {m.orderId ? (
                          <Link href={`/vendas/${m.orderId}`}><MovementBadge type={m.type} /></Link>
                        ) : (
                          <MovementBadge type={m.type} />
                        )}
                      </td>
                      <td className={`${table.tdRight} ${m.quantity < 0 ? "text-plum" : "text-ink"}`}>
                        {m.quantity > 0 ? "+" : ""}{m.quantity}
                      </td>
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
