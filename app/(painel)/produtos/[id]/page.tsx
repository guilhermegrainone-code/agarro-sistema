import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: { orderBy: [{ color: "asc" }, { size: "asc" }] } },
  });
  if (!product) notFound();

  return (
    <div>
      <PageHeader title={product.name} subtitle="Editar produto" />
      <ProductForm
        initial={{
          id: product.id,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          costCents: product.costCents,
          weightKg: product.weightKg,
          heightCm: product.heightCm,
          widthCm: product.widthCm,
          lengthCm: product.lengthCm,
          images: product.images,
          active: product.active,
          variants: product.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock })),
        }}
      />
    </div>
  );
}
