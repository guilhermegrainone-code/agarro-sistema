"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Visão geral", exact: true },
  { href: "/vendas", label: "Vendas" },
  { href: "/estoque", label: "Estoque" },
  { href: "/produtos", label: "Produtos" },
  { href: "/relatorios", label: "Relatórios" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(link: (typeof links)[number]) {
    return link.exact ? pathname === link.href : pathname.startsWith(link.href);
  }

  return (
    <nav className="flex flex-col border-b border-line bg-paper md:h-full md:justify-between md:border-b-0 md:border-r md:p-6">
      <div>
        <div className="flex items-center justify-between px-4 pt-4 md:px-0 md:pt-0">
          <Link href="/" className="font-display text-lg tracking-[0.2em] text-ink">
            AGARRÔ
          </Link>
          <span className="text-[10px] uppercase tracking-[0.2em] text-graphite">sistema</span>
        </div>
        <ul className="mt-3 flex gap-1 overflow-x-auto px-4 pb-3 md:mt-8 md:flex-col md:px-0 md:pb-0">
          {links.map((link) => {
            const active = isActive(link);
            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className={`block whitespace-nowrap px-3 py-2 text-sm ${
                    active ? "bg-ink text-paper" : "text-graphite hover:bg-line/60"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="hidden md:flex md:flex-col md:gap-2">
        {process.env.NEXT_PUBLIC_SITE_URL && (
          <a
            href={process.env.NEXT_PUBLIC_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-graphite underline underline-offset-4 hover:text-ink"
          >
            Ver a loja
          </a>
        )}
        <button
          onClick={handleLogout}
          className="border border-line px-3 py-2 text-left text-sm text-graphite hover:border-ink hover:text-ink"
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
