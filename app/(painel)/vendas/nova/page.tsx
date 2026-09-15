import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { SaleForm } from "@/components/admin/SaleForm";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      priceCents: true,
      variants: { select: { id: true, size: true, color: true, stock: true }, orderBy: [{ size: "asc" }, { color: "asc" }] },
    },
  });

  return (
    <div>
      <PageHeader title="Registrar venda" subtitle="Para vendas feitas na loja física, por WhatsApp ou Instagram. O estoque é baixado automaticamente." />
      <SaleForm products={products.filter((p) => p.variants.length > 0)} />
    </div>
  );
}
