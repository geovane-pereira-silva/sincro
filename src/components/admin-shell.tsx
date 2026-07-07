import { type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  DollarSign,
  FileBarChart,
  Clock,
  Crown,
  LifeBuoy,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { SincroMark } from "@/components/sincro-logo";
import { AdminGlobalSearch } from "@/components/admin-global-search";
import { usePlanFilter, PLANO_FILTRO_OPCOES } from "@/hooks/use-plan-filter";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, exact: false },
  { to: "/admin/empresas", label: "Empresas", icon: Building2, exact: false },
  { to: "/admin/relatorios", label: "Relatórios", icon: FileBarChart, exact: false },
  { to: "/admin/financeiro", label: "Financeiro", icon: DollarSign, exact: false },
  { to: "/admin/registros", label: "Registros", icon: Clock, exact: false },
  { to: "/admin/premium", label: "Premium", icon: Crown, exact: false },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy, exact: false },
  { to: "/admin/config", label: "Config", icon: Settings, exact: false },
] as const;

function PlanoFiltroBadge() {
  const { plano } = usePlanFilter();
  if (plano === "todos") return null;
  const label = PLANO_FILTRO_OPCOES.find((o) => o.value === plano)?.label ?? plano;
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-bold text-amber-950">
      Filtrando: {label}
    </span>
  );
}



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
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 bg-primary px-4 text-primary-foreground md:px-8">
        <AdminBrand />

        {/* Nav desktop */}
        <nav className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-2.5 -bottom-[26px] h-[3px] rounded-full bg-ponto-entrada" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto mr-1 hidden lg:block">
          <PlanoFiltroBadge />
        </div>

        <AdminGlobalSearch className="relative ml-auto hidden w-64 md:block lg:ml-2 lg:w-56" />

        <button
          onClick={() => navigate({ to: "/ponto" })}
          className="hidden items-center gap-2 rounded-xl border border-primary-foreground/30 px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-white/10 lg:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" /> App
        </button>
      </header>

      {/* Busca mobile */}
      <div className="border-b border-border bg-primary px-4 pb-3 md:hidden">
        <AdminGlobalSearch className="relative" />
      </div>

      {/* Conteúdo */}
      <main>
        <div className="mx-auto max-w-5xl px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-12">
          {children}
        </div>
      </main>

      {/* Bottom nav mobile (scrollável) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-white/10 bg-sidebar text-sidebar-foreground lg:hidden">
        {NAV.map((item) => {
          const active = isActive(item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-[68px] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-ponto-entrada" : "text-sidebar-foreground/70",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
