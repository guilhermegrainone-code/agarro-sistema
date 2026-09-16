import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionFromCookies } from "@/lib/auth";

// O upload roda em Node (não no Edge) para o SDK do Blob ter acesso ao token OIDC da Vercel.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Autenticação do Blob: na Vercel, conectar o store cria BLOB_STORE_ID e o SDK usa
  // OIDC automaticamente. Um BLOB_READ_WRITE_TOKEN estático (com ou sem prefixo)
  // também é aceito — útil fora da Vercel.
  const tokenKey = Object.keys(process.env).find((k) => k.endsWith("READ_WRITE_TOKEN"));
  const token = tokenKey ? process.env[tokenKey] : undefined;
  if (!token && !process.env.BLOB_STORE_ID) {
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
      addRandomSuffix: true,
      ...(token ? { token } : {}),
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Erro no upload para o Vercel Blob", error);
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: `Não foi possível salvar a foto${message ? ` (${message})` : ""}. Tente de novo.` },
      { status: 502 },
    );
  }
}
