import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { slugify } from "@/lib/format";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, priceCents, costCents, weightKg, heightCm, widthCm, lengthCm, images, active, variants } = body;

  if (!name || !priceCents) {
    return NextResponse.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${attempt++}`;
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description: description ?? "",
      priceCents: Math.round(priceCents),
      costCents: Math.round(costCents ?? 0),
      weightKg: weightKg ?? 0.3,
      heightCm: heightCm ?? 4,
      widthCm: widthCm ?? 25,
      lengthCm: lengthCm ?? 20,
      images: images ?? [],
      active: active ?? true,
      variants: {
        create: (variants ?? []).map((v: any) => ({
          size: v.size,
          color: v.color ?? "",
          stock: v.stock ?? 0,
          sku: v.sku ?? null,
        })),
      },
    },
    include: { variants: true },
  });

  // Estoque informado no cadastro entra no histórico como "Estoque inicial".
  const initial = product.variants.filter((v) => v.stock !== 0);
  if (initial.length > 0) {
    await prisma.stockMovement.createMany({
      data: initial.map((v) => ({
        variantId: v.id,
        type: "ENTRADA" as const,
        quantity: v.stock,
        note: "Estoque inicial",
      })),
    });
  }

  return NextResponse.json(product, { status: 201 });
}
