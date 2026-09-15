import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  const blob = await put(`produtos/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
