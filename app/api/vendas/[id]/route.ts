import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { applyOrderStock, revertOrderStock } from "@/lib/stock";

type Params = { params: { id: string } };

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELED"];

/** Muda o status de uma venda, mantendo o estoque coerente. */
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { status, paymentMethod, note } = await request.json();
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: params.id } });
    if (!current) return null;

    const nextStatus: OrderStatus = status ?? current.status;
    const updated = await tx.order.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        paymentMethod: paymentMethod ?? current.paymentMethod,
        note: note ?? current.note,
        paidAt:
          nextStatus === "PAID" || nextStatus === "SHIPPED" || nextStatus === "DELIVERED"
            ? current.paidAt ?? new Date()
            : nextStatus === "PENDING"
              ? null
              : current.paidAt,
      },
    });

    if (nextStatus === "CANCELED") {
      await revertOrderStock(tx, params.id);
    } else if (nextStatus !== "PENDING" || current.channel !== "SITE") {
      // Pago/enviado/entregue: garante que a baixa aconteceu (site só baixa ao pagar;
      // vendas manuais já baixaram na criação — aqui é idempotente).
      await applyOrderStock(tx, params.id);
    }

    return updated;
  });

  if (!order) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
  return NextResponse.json(order);
}

/** Exclui uma venda registrada por engano, devolvendo as peças ao estoque. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await prisma.$transaction(async (tx) => {
    await revertOrderStock(tx, params.id);
    await tx.order.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ ok: true });
}
