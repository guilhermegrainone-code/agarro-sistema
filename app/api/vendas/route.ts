import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { applyOrderStock } from "@/lib/stock";

/**
 * Registro manual de venda (loja física, WhatsApp, Instagram...).
 * Preços vêm do banco; o desconto é informado no formulário.
 */
export async function POST(request: NextRequest) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    channel, paymentMethod, customerName, customerPhone, items, discountCents, note, paid, soldAt,
  } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Adicione pelo menos uma peça" }, { status: 400 });
  }

  const variantIds = items.map((i: any) => i.variantId).filter(Boolean);
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    include: { product: true },
  });

  const orderItems = items.map((item: any) => {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) throw new Error("Variação não encontrada");
    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
    // Permite ajustar o preço unitário na hora (ex.: promoção no balcão); se não vier, usa o do cadastro.
    const priceCents = Number.isFinite(Number(item.priceCents))
      ? Math.round(Number(item.priceCents))
      : variant.product.priceCents;
    return {
      productId: variant.productId,
      variantId: variant.id,
      name: variant.product.name,
      size: variant.size,
      color: variant.color,
      priceCents,
      costCents: variant.product.costCents,
      quantity,
    };
  });

  const subtotalCents = orderItems.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const discount = Math.min(Math.max(0, Math.round(Number(discountCents) || 0)), subtotalCents);
  const totalCents = subtotalCents - discount;
  const isPaid = paid !== false;
  const createdAt = soldAt ? new Date(soldAt) : new Date();

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          status: isPaid ? "PAID" : "PENDING",
          channel: channel ?? "LOJA_FISICA",
          paymentMethod: paymentMethod ?? "",
          customerName: (customerName ?? "").trim() || "Cliente balcão",
          customerPhone: customerPhone ?? "",
          subtotalCents,
          discountCents: discount,
          shippingCents: 0,
          totalCents,
          note: note ?? "",
          paidAt: isPaid ? createdAt : null,
          createdAt: Number.isNaN(createdAt.getTime()) ? undefined : createdAt,
          items: { create: orderItems },
        },
      });
      // A peça saiu da loja na hora, pago ou não — baixa o estoque já.
      await applyOrderStock(tx, created.id);
      return created;
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Não foi possível registrar a venda" }, { status: 500 });
  }
}
