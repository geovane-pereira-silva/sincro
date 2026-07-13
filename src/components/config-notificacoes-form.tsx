import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useConfigNotificacoes,
  useSalvarConfigNotificacoes,
  CONFIG_NOTIF_DEFAULT,
} from "@/hooks/use-config-notificacoes";
import {
  solicitarPermissaoPush,
  permissaoPushAtual,
  assinarWebPush,
  cancelarWebPush,
} from "@/lib/pushNotifications";
import { useServerFn } from "@tanstack/react-start";
import {
  salvarPushSubscription,
  removerPushSubscription,
} from "@/lib/push.functions";
import { mensagemErro } from "@/lib/erros";

export function ConfigNotificacoesForm({ userId }: { userId: string }) {
  const { data, isLoading } = useConfigNotificacoes(userId);
  const salvar = useSalvarConfigNotificacoes();
  const salvarSub = useServerFn(salvarPushSubscription);
  const removerSub = useServerFn(removerPushSubscription);

  const [entrada, setEntrada] = useState(CONFIG_NOTIF_DEFAULT.lembrete_entrada);
  const [horario, setHorario] = useState(
    CONFIG_NOTIF_DEFAULT.lembrete_entrada_horario,
  );
  const [intervalo, setIntervalo] = useState(
    CONFIG_NOTIF_DEFAULT.lembrete_intervalo,
  );
  const [saida, setSaida] = useState(CONFIG_NOTIF_DEFAULT.lembrete_saida);
  const [antecedencia, setAntecedencia] = useState(
    String(CONFIG_NOTIF_DEFAULT.lembrete_antecedencia_minutos),
  );
  const [push, setPush] = useState(false);

  useEffect(() => {
    if (data) {
      setEntrada(data.lembrete_entrada);
      setHorario(data.lembrete_entrada_horario ?? "08:00");
      setIntervalo(data.lembrete_intervalo);
      setSaida(data.lembrete_saida);
      setAntecedencia(String(data.lembrete_antecedencia_minutos));
      setPush(data.push_habilitado);
    }
  }, [data]);

  async function handlePushToggle(next: boolean) {
    if (next) {
      const ok = await solicitarPermissaoPush();
      if (!ok) {
        const estado = permissaoPushAtual();
        toast.error(
          estado === "denied"
            ? "Permissão de notificações negada no navegador."
            : "Não foi possível ativar as notificações push.",
        );
        setPush(false);
        return;
      }
    }
    setPush(next);
  }

  async function handleSalvar() {
    try {
      await salvar.mutateAsync({
        lembrete_entrada: entrada,
        lembrete_entrada_horario: horario,
        lembrete_saida: saida,
        lembrete_intervalo: intervalo,
        lembrete_antecedencia_minutos: Number(antecedencia),
        push_habilitado: push,
      });
      toast.success("Preferências de notificação salvas.");
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  }

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Lembretes de ponto</h3>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm">Lembrete de entrada</Label>
          <p className="text-xs text-muted-foreground">
            Avisa perto do horário de entrada.
          </p>
        </div>
        <Switch checked={entrada} onCheckedChange={setEntrada} />
      </div>
      {entrada && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-xs">Horário de entrada</Label>
          <Input
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="w-36"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm">Lembrete de intervalo</Label>
          <p className="text-xs text-muted-foreground">
            Avisa sobre a pausa do dia.
          </p>
        </div>
        <Switch checked={intervalo} onCheckedChange={setIntervalo} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm">Lembrete de saída</Label>
          <p className="text-xs text-muted-foreground">
            Baseado na sua jornada.
          </p>
        </div>
        <Switch checked={saida} onCheckedChange={setSaida} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Antecedência</Label>
        <Select value={antecedencia} onValueChange={setAntecedencia}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 minutos antes</SelectItem>
            <SelectItem value="10">10 minutos antes</SelectItem>
            <SelectItem value="15">15 minutos antes</SelectItem>
            <SelectItem value="30">30 minutos antes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
        <div>
          <Label className="text-sm">Notificações push</Label>
          <p className="text-xs text-muted-foreground">
            Alertas mesmo com o app em segundo plano. Se negado, usamos avisos
            na tela enquanto o app estiver aberto.
          </p>
        </div>
        <Switch checked={push} onCheckedChange={handlePushToggle} />
      </div>

      <Button onClick={handleSalvar} disabled={salvar.isPending}>
        {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar preferências
      </Button>
    </div>
  );
}
