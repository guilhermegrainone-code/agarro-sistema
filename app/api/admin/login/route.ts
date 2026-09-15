import { NextRequest, NextResponse } from "next/server";
import { checkAdminCredentials, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!checkAdminCredentials(email, password)) {
    return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });
  }

  const token = createSessionToken(email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
