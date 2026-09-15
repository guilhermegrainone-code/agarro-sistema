import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { registerMovement } from "@/lib/stock";

/** Entrada, saída ou ajuste manual de estoque de uma variação. */
export async function POST(request: NextRequest) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { variantId, type, quantity, note } = await request.json();
  const qty = Math.abs(Math.trunc(Number(quantity)));

  if (!variantId || !qty || !["ENTRADA", "SAIDA", "AJUSTE"].includes(type)) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // ENTRADA soma, SAIDA subtrai; AJUSTE recebe o sinal direto do formulário.
  const delta = type === "SAIDA" ? -qty : type === "ENTRADA" ? qty : Math.trunc(Number(quantity));

  try {
    const movement = await registerMovement({ variantId, type, quantity: delta, note: note ?? "" });
    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar movimentação";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
