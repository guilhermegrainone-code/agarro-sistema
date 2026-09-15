import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { getSessionFromCookies } from "@/lib/auth";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  if (!getSessionFromCookies()) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[220px_1fr]">
      <AdminNav />
      <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
    </div>
  );
}
