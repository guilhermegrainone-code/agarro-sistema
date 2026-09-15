import type { OrderStatus, OrderChannel, MovementType } from "@prisma/client";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

export const CHANNEL_LABELS: Record<OrderChannel, string> = {
  SITE: "Site",
  LOJA_FISICA: "Loja física",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  OUTRO: "Outro",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
  VENDA: "Venda",
  DEVOLUCAO: "Devolução",
};

export const PAYMENT_METHODS = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Mercado Pago",
  "Outro",
];

/** Vendas que contam como receita (dinheiro que entrou de fato). */
export const REVENUE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];
