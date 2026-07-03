import { type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Trophy, ArrowLeft } from "lucide-react";
import { SincroMark } from "@/components/sincro-logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, exact: false },
  { to: "/admin/gamificacao", label: "Gamificação", icon: Trophy, exact: false },
] as const;

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
}

function AdminBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <SincroMark size={36} />
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-primary-foreground">
          SINCRO
        </span>
        <span className="rounded-full bg-ponto-entrada px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ponto-entrada-foreground">
          Admin
        </span>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const isActive = useActive();

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header topo (desktop + mobile) */}
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 bg-primary px-4 text-primary-foreground md:px-8">
        <AdminBrand />

        {/* Nav desktop */}
        <nav className="ml-6 hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[26px] h-[3px] rounded-full bg-ponto-entrada" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => navigate({ to: "/ponto" })}
          className="ml-auto hidden items-center gap-2 rounded-xl border border-primary-foreground/30 px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-white/10 md:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao app
        </button>
      </header>

      {/* Conteúdo */}
      <main>
        <div className="mx-auto max-w-5xl px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-12">
          {children}
        </div>
      </main>

      {/* Bottom nav mobile (4 itens) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-sidebar text-sidebar-foreground md:hidden">
        {NAV.map((item) => {
          const active = isActive(item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-ponto-entrada" : "text-sidebar-foreground/70",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => navigate({ to: "/ponto" })}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-sidebar-foreground/70 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>
      </nav>
    </div>
  );
}
