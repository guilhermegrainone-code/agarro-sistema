"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-line p-8">
        <p className="font-display text-2xl tracking-[0.2em] text-ink">AGARRÔ</p>
        <h1 className="mt-1 text-sm uppercase tracking-[0.15em] text-graphite">Sistema da loja</h1>
        <div className="mt-6 flex flex-col gap-3">
          <input
            required
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-line px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-line px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </form>
    </main>
  );
}
