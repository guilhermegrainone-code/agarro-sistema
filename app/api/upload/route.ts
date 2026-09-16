import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // A Vercel às vezes cria a variável com prefixo (ex.: MEU_STORE_READ_WRITE_TOKEN);
  // aceitamos qualquer nome que termine em READ_WRITE_TOKEN.
  const tokenKey = Object.keys(process.env).find((k) => k.endsWith("READ_WRITE_TOKEN"));
  const token = tokenKey ? process.env[tokenKey] : undefined;
  if (!token) {
    return NextResponse.json(
      { error: "O armazenamento de fotos ainda não foi configurado (Vercel → Storage → Blob → conectar ao projeto)." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  try {
    const blob = await put(`produtos/${Date.now()}-${file.name}`, file, {
      access: "public",
      token,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Erro no upload para o Vercel Blob", error);
    return NextResponse.json({ error: "Não foi possível salvar a foto. Tente de novo." }, { status: 502 });
  }
}
