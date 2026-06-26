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
    <div className="flex items-center gap-3">
      <SincroMark size={40} />
      <div className="leading-tight">
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          SINCRO
        </span>
        <span className="ml-2 rounded-full bg-ponto-entrada/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ponto-entrada">
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
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
        <div className="px-1 py-2">
          <AdminBrand />
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-all",
                isActive(item.to, item.exact)
                  ? "bg-white/10 text-sidebar-foreground"
                  : "text-sidebar-foreground/80 hover:bg-white/10",
              )}
            >
              <item.icon className="h-5 w-5 text-ponto-entrada" />
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => navigate({ to: "/ponto" })}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-sidebar-foreground/80 transition-all hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar ao app
        </button>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between bg-primary px-5 text-primary-foreground md:hidden">
        <AdminBrand />
        <button
          onClick={() => navigate({ to: "/ponto" })}
          aria-label="Voltar ao app"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>

      {/* Conteúdo */}
      <main className="md:pl-[280px]">
        <div className="mx-auto max-w-5xl px-4 py-6 pb-28 md:px-8 md:pb-10">
          {children}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-sidebar text-sidebar-foreground md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-all",
              isActive(item.to, item.exact)
                ? "text-ponto-entrada"
                : "text-sidebar-foreground/70",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
