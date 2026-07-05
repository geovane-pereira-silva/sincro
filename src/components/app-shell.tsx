import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  Clock,
  ListChecks,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { saudacao, type Profile } from "@/lib/ponto";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { PremiumProvider } from "@/components/premium-context";
import { PremiumPill } from "@/components/premium-gate";
import { SystemBanner } from "@/components/system-banner";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { usePremiumStatus } from "@/hooks/use-premium";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { useIsSuperadmin } from "@/hooks/use-is-superadmin";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/ponto", label: "Meu Ponto", icon: Clock },
  { to: "/historico", label: "Histórico", icon: ListChecks },
  { to: "/relatorio", label: "Relatório", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({
  profile,
  children,
}: {
  profile: Profile | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const nome =
    profile?.nome_completo?.split(" ")[0] ||
    profile?.email?.split("@")[0] ||
    "você";
  const tz = profile?.timezone ?? "America/Sao_Paulo";
  const { isPremium } = usePremiumStatus(profile?.id);
  const { data: config } = useAdminConfig();
  const { data: isAdmin } = useIsSuperadmin(profile?.id);

  async function handleLogout() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Conta bloqueada: encerra a sessão imediatamente.
  const bloqueado = profile?.bloqueado === true;
  useEffect(() => {
    if (!bloqueado) return;
    (async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    })();
  }, [bloqueado, navigate, queryClient]);

  if (bloqueado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Conta suspensa. Entre em contato com o suporte.
        </p>
      </div>
    );
  }

  // Modo manutenção: usuários não-admin veem a tela de manutenção.
  if (config?.modo_manutencao && !isAdmin) {
    return <MaintenanceScreen horario={config.horario_manutencao} />;
  }

  // Onboarding obrigatório de primeiro acesso (não pulável).
  if (profile && !profile.onboarding_concluido) {
    return <OnboardingScreen profile={profile} />;
  }

  return (
    <PremiumProvider
      userId={profile?.id}
      referralCode={profile?.referral_code ?? null}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between bg-primary px-6 text-primary-foreground">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 border border-white/10">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={nome} />
              )}
              <AvatarFallback className="bg-[#1E3A5F] text-sm font-bold text-ponto-entrada">
                {iniciais(profile?.nome_completo || profile?.email || "P")}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-base font-medium">
                <span className="capitalize">{saudacao(tz)}</span>,{" "}
                <span className="font-semibold capitalize">{nome}</span>
              </p>
              {isPremium && <PremiumPill />}
            </div>
          </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Abrir menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground transition-all hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[280px] border-0 bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground/70"
          >
            <SheetHeader className="border-b border-white/10 p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border border-white/10">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt={nome} />
                  )}
                  <AvatarFallback className="bg-[#1E3A5F] text-base font-bold text-ponto-entrada">
                    {iniciais(profile?.nome_completo || profile?.email || "P")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-sidebar-foreground">
                    {profile?.nome_completo || nome}
                  </p>
                  <p className="truncate text-[13px] text-sidebar-foreground/60">
                    {profile?.email}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <nav className="flex flex-col gap-1 p-3">
              {NAV.map((item) => {
                const active =
                  pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-6 py-4 text-[15px] font-medium transition-all",
                      active
                        ? "bg-white/10 text-sidebar-foreground"
                        : "text-sidebar-foreground/90 hover:bg-white/10",
                    )}
                  >
                    <item.icon className="h-5 w-5 text-ponto-entrada" />
                    {item.label}
                  </Link>
                );
              })}

              <Separator className="my-2 bg-white/10" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-6 py-4 text-[15px] font-medium text-destructive transition-all hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

        <main className="flex-1 px-4 py-5">{children}</main>
      </div>
    </PremiumProvider>
  );
}
