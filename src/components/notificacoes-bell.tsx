import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotificacoes } from "@/hooks/use-notificacoes";
import {
  NOTIF_ICON,
  NOTIF_COR,
  type TipoNotificacao,
} from "@/lib/notificacoes";
import { tempoRelativo } from "@/lib/solicitacoes";
import { EmptyState } from "@/components/admin-ui";

export function NotificacoesBell({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const navigate = useNavigate();
  const { notificacoes, naoLidas, isLoading, marcarLida, marcarTodasLidas } =
    useNotificacoes();

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Notificações"
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10",
          variant === "dark" && "hover:bg-muted",
        )}
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ponto-saida px-1 text-[10px] font-bold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => marcarTodasLidas()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : notificacoes.length === 0 ? (
            <EmptyState
              title="Sem notificações"
              description="Você está em dia."
              className="py-8"
            />
          ) : (
            <ul className="divide-y">
              {notificacoes.map((n) => {
                const Icon = NOTIF_ICON[n.tipo as TipoNotificacao] ?? Bell;
                const cor = NOTIF_COR[n.tipo as TipoNotificacao] ?? "text-primary";
                return (
                  <li key={n.id}>
                    <button
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        !n.lida && "bg-primary/5",
                      )}
                      onClick={() => {
                        if (!n.lida) marcarLida(n.id);
                        if (n.link) navigate({ to: n.link });
                      }}
                    >
                      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cor)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {n.titulo}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {n.mensagem}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {tempoRelativo(n.created_at)}
                        </p>
                      </div>
                      {!n.lida && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
