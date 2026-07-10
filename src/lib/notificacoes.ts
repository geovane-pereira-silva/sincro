// Ícones e rótulos das notificações in-app.
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  AlarmClock,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export type Notificacao = Tables<"notificacoes">;

export type TipoNotificacao =
  | "solicitacao_criada"
  | "solicitacao_aprovada"
  | "solicitacao_rejeitada"
  | "lembrete_ponto"
  | "hora_extra_pendente"
  | "ponto_incompleto";

export const NOTIF_ICON: Record<TipoNotificacao, LucideIcon> = {
  solicitacao_criada: Bell,
  solicitacao_aprovada: CheckCircle2,
  solicitacao_rejeitada: XCircle,
  lembrete_ponto: AlarmClock,
  hora_extra_pendente: Clock,
  ponto_incompleto: AlertTriangle,
};

export const NOTIF_COR: Record<TipoNotificacao, string> = {
  solicitacao_criada: "text-primary",
  solicitacao_aprovada: "text-ponto-entrada",
  solicitacao_rejeitada: "text-ponto-saida",
  lembrete_ponto: "text-ponto-entrada-intervalo",
  hora_extra_pendente: "text-ponto-saida-intervalo",
  ponto_incompleto: "text-ponto-saida-intervalo",
};
