import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
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
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Erro no upload para o Vercel Blob", error);
    return NextResponse.json({ error: "Não foi possível salvar a foto. Tente de novo." }, { status: 502 });
  }
}
