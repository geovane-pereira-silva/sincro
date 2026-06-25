import { useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/ponto", label: "Bater ponto", icon: Clock },
  { to: "/historico", label: "Histórico", icon: ListChecks },
  { to: "/relatorio", label: "Relatório mensal", icon: BarChart3 },
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

  async function handleLogout() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {saudacao(tz)},
          </p>
          <p className="truncate text-base font-semibold capitalize text-foreground">
            {nome}
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Abrir menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="border-b border-border p-5">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt={nome} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {iniciais(profile?.nome_completo || profile?.email || "P")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-foreground">
                    {profile?.nome_completo || nome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
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
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}

              <Separator className="my-2" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
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
  );
}
