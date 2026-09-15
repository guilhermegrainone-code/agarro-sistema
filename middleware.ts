import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";

// O middleware roda no Edge Runtime, onde `jsonwebtoken` não funciona — por isso
// aqui só checamos a presença do cookie. A validação da assinatura é feita no
// layout do painel e nas rotas de API, que rodam em Node.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = pathname === "/login" || pathname.startsWith("/api/admin/login");
  if (isPublic) return NextResponse.next();

  if (!request.cookies.get(COOKIE_NAME)?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Tudo, exceto arquivos estáticos (Next, ícones, manifesto, fotos) — o iPhone
  // precisa baixar o ícone e o manifesto sem estar logado.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)$).*)"],
};
