import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: true },
  });
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name, description, priceCents, costCents, weightKg, heightCm, widthCm, lengthCm,
    images, active, variants,
  } = body;

  if (!name || !priceCents) {
    return NextResponse.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: true },
  });
  if (!existing) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  type IncomingVariant = { id?: string; size: string; color?: string; stock?: number; sku?: string };
  const incoming: IncomingVariant[] = (variants ?? []).filter((v: IncomingVariant) => v.size?.trim());

  const product = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: params.id },
      data: {
        name,
        description: description ?? "",
        priceCents: Math.round(priceCents),
        costCents: Math.round(costCents ?? 0),
        weightKg: weightKg ?? 0.3,
        heightCm: heightCm ?? 4,
        widthCm: widthCm ?? 25,
        lengthCm: lengthCm ?? 20,
        images: images ?? [],
        active: active ?? true,
      },
    });

    // Variações removidas no formulário são apagadas; as demais são atualizadas ou criadas.
    const keptIds = incoming.map((v) => v.id).filter(Boolean) as string[];
    await tx.variant.deleteMany({
      where: { productId: params.id, id: { notIn: keptIds } },
    });

    for (const v of incoming) {
      const stock = Number(v.stock ?? 0);
      const current = v.id ? existing.variants.find((e) => e.id === v.id) : undefined;

      if (current) {
        await tx.variant.update({
          where: { id: current.id },
          data: { size: v.size, color: v.color ?? "", stock, sku: v.sku ?? null },
        });
        // Mudou o estoque direto no cadastro? Registra como ajuste, para o histórico bater.
        if (stock !== current.stock) {
          await tx.stockMovement.create({
            data: {
              variantId: current.id,
              type: "AJUSTE",
              quantity: stock - current.stock,
              note: "Ajuste feito no cadastro do produto",
            },
          });
        }
      } else {
        const created = await tx.variant.create({
          data: { productId: params.id, size: v.size, color: v.color ?? "", stock, sku: v.sku ?? null },
        });
        if (stock !== 0) {
          await tx.stockMovement.create({
            data: { variantId: created.id, type: "ENTRADA", quantity: stock, note: "Estoque inicial" },
          });
        }
      }
    }

    return tx.product.findUnique({ where: { id: params.id }, include: { variants: true } });
  });

  return NextResponse.json(product);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sales = await prisma.orderItem.count({ where: { productId: params.id } });
  if (sales > 0) {
    // Produto com vendas não pode sumir (o histórico de vendas depende dele) — só sai da loja.
    await prisma.product.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({
      ok: true,
      archived: true,
      message: "Este produto já tem vendas registradas, então foi despublicado em vez de excluído.",
    });
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
