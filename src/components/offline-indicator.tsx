// Indicador de conexão + fila de pontos offline.
import { Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  online: boolean;
  pendentes: number;
  className?: string;
}

export function OfflineIndicator({
  online,
  pendentes,
  className,
}: OfflineIndicatorProps) {
  if (online && pendentes === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-ponto-entrada/10 px-2.5 py-1 text-xs font-medium text-ponto-entrada",
          className,
        )}
        title="Conectado"
      >
        <Cloud className="h-3.5 w-3.5" />
        Online
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online
          ? "bg-ponto-saida-intervalo/10 text-ponto-saida-intervalo"
          : "bg-ponto-saida/10 text-ponto-saida",
        className,
      )}
      title={online ? "Sincronizando pontos pendentes" : "Sem conexão"}
    >
      <CloudOff className="h-3.5 w-3.5" />
      {online ? "Sincronizando" : "Offline"}
      {pendentes > 0 && (
        <span className="ml-0.5 rounded-full bg-current/20 px-1.5 text-[10px] font-bold tabular-nums">
          {pendentes}
        </span>
      )}
    </span>
  );
}
