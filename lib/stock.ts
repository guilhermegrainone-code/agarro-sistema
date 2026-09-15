import { Prisma, MovementType } from "@prisma/client";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;

/**
 * Registra uma movimentação manual (entrada, saída ou ajuste) e atualiza o saldo
 * da variação na mesma transação. `quantity` é sempre o delta: positivo entra,
 * negativo sai. Para AJUSTE, informe o delta necessário para chegar no saldo desejado.
 */
export async function registerMovement(params: {
  variantId: string;
  type: MovementType;
  quantity: number;
  note?: string;
}) {
  const { variantId, type, quantity, note = "" } = params;
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new Error("Quantidade inválida");
  }

  return prisma.$transaction(async (tx) => {
    const variant = await tx.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new Error("Variação não encontrada");
    if (variant.stock + quantity < 0) {
      throw new Error(`Estoque insuficiente: há apenas ${variant.stock} unidade(s).`);
    }
    await tx.variant.update({ where: { id: variantId }, data: { stock: { increment: quantity } } });
    return tx.stockMovement.create({ data: { variantId, type, quantity, note } });
  });
}

/** Saldo líquido das movimentações de um pedido por variação (negativo = peças baixadas). */
async function orderNetByVariant(tx: Tx, orderId: string) {
  const movements = await tx.stockMovement.findMany({ where: { orderId } });
  const net = new Map<string, number>();
  for (const m of movements) net.set(m.variantId, (net.get(m.variantId) ?? 0) + m.quantity);
  return net;
}

/**
 * Dá baixa no estoque de todos os itens de um pedido (tipo VENDA).
 * Idempotente: se o pedido já está baixado, não faz nada de novo. Se foi
 * cancelado (devolvido) e reativado, baixa outra vez.
 * Não bloqueia estoque negativo — a venda já aconteceu; melhor registrar e
 * deixar o saldo negativo visível no painel para ela corrigir.
 */
export async function applyOrderStock(tx: Tx, orderId: string) {
  const net = await orderNetByVariant(tx, orderId);
  const items = await tx.orderItem.findMany({ where: { orderId } });

  for (const item of items) {
    if (!item.variantId) continue;
    if ((net.get(item.variantId) ?? 0) < 0) continue; // já baixado
    await tx.variant.update({
      where: { id: item.variantId },
      data: { stock: { decrement: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        variantId: item.variantId,
        orderId,
        type: "VENDA",
        quantity: -item.quantity,
        note: `Venda ${shortId(orderId)}`,
      },
    });
  }
}

/**
 * Devolve ao estoque os itens de um pedido cancelado (tipo DEVOLUCAO).
 * Só devolve o que tinha sido baixado e ainda não foi devolvido.
 */
export async function revertOrderStock(tx: Tx, orderId: string) {
  const net = await orderNetByVariant(tx, orderId);

  for (const [variantId, balance] of net) {
    if (balance >= 0) continue; // nada pendente de devolução
    await tx.variant.update({
      where: { id: variantId },
      data: { stock: { increment: -balance } },
    });
    await tx.stockMovement.create({
      data: {
        variantId,
        orderId,
        type: "DEVOLUCAO",
        quantity: -balance,
        note: `Cancelamento da venda ${shortId(orderId)}`,
      },
    });
  }
}

export function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

/** Abaixo desse saldo a peça aparece como "estoque baixo" no painel. */
export const LOW_STOCK_THRESHOLD = 2;
