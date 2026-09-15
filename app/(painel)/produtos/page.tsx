import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPriceCents } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { PageHeader, ButtonLink, Card, Empty, table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: true, _count: { select: { orderItems: true } } },
  });

  return (
    <div>
      <PageHeader title="Produtos" subtitle={`${products.length} cadastrados`} action={<ButtonLink href="/produtos/novo">+ Cadastrar produto</ButtonLink>} />
      <Card>
        {products.length === 0 ? (
          <Empty>Nenhum produto cadastrado.</Empty>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}></th>
                  <th className={table.th}>Produto</th>
                  <th className={table.thRight}>Preço</th>
                  <th className={table.thRight}>Custo</th>
                  <th className={table.thRight}>Estoque</th>
                  <th className={table.th}>Variações</th>
                  <th className={table.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = p.variants.reduce((s, v) => s + v.stock, 0);
                  const low = p.variants.filter((v) => v.stock <= LOW_STOCK_THRESHOLD).length;
                  const margin = p.costCents > 0 ? Math.round(((p.priceCents - p.costCents) / p.priceCents) * 100) : null;
                  return (
                    <tr key={p.id} className="hover:bg-line/30">
                      <td className={`${table.td} w-14`}>
                        <div className="relative h-14 w-11 overflow-hidden bg-line">
                          {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" sizes="44px" />}
                        </div>
                      </td>
                      <td className={table.td}>
                        <Link href={`/produtos/${p.id}`} className="hover:underline">{p.name}</Link>
                      </td>
                      <td className={table.tdRight}>{formatPriceCents(p.priceCents)}</td>
                      <td className={`${table.tdRight} text-graphite`}>
                        {p.costCents > 0 ? (
                          <>
                            {formatPriceCents(p.costCents)}
                            <p className="text-xs">margem {margin}%</p>
                          </>
                        ) : "—"}
                      </td>
                      <td className={table.tdRight}>
                        {stock}
                        {low > 0 && <p className="text-xs text-plum">{low} {low === 1 ? "variação baixa" : "variações baixas"}</p>}
                      </td>
                      <td className={`${table.td} text-graphite`}>{p.variants.length}</td>
                      <td className={table.td}>
                        <span className={`text-xs uppercase tracking-[0.1em] ${p.active ? "text-ink" : "text-graphite"}`}>
                          {p.active ? "Publicado" : "Despublicado"}
                        </span>
                      </td>
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
