import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CardSkeleton } from "@/components/admin-ui";
import { useAdminConfigRaw } from "@/hooks/use-admin-config";
import { useSalvarConfig } from "@/hooks/use-admin-actions";

export const Route = createFileRoute("/_authenticated/admin/config/")({
  head: () => ({ meta: [{ title: "Configurações — Admin SINCRO" }] }),
  component: AdminConfigPage,
});

function AdminConfigPage() {
  const { data: raw, isLoading } = useAdminConfigRaw();
  const salvar = useSalvarConfig();

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (raw) setForm(raw);
  }, [raw]);

  function set(chave: string, valor: string) {
    setForm((f) => ({ ...f, [chave]: valor }));
  }

  function handleSalvar() {
    const entries = Object.entries(form).map(([chave, valor]) => ({
      chave,
      valor,
    }));
    salvar.mutate({ entries });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Configurações Admin</h1>
        <p className="text-sm text-muted-foreground">
          Alterações valem para todos os usuários imediatamente.
        </p>
      </div>

      {/* Mensagem do sistema */}
      <section className="space-y-3 rounded-2xl bg-card p-5 shadow-card">
        <div>
          <h2 className="text-sm font-bold text-primary">
            Mensagem do sistema
          </h2>
          <p className="text-xs text-muted-foreground">
            Exibida como banner para todos os usuários logados. Vazio = sem
            banner.
          </p>
        </div>
        <Textarea
          value={form.mensagem_sistema ?? ""}
          onChange={(e) => set("mensagem_sistema", e.target.value)}
          placeholder="Ex.: Manutenção programada para domingo às 02h."
          rows={2}
        />
      </section>

      {/* Modo manutenção */}
      <section className="space-y-3 rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-primary">Modo manutenção</h2>
            <p className="text-xs text-muted-foreground">
              Usuários não-admin veem uma tela de manutenção.
            </p>
          </div>
          <Switch
            checked={form.modo_manutencao === "true"}
            onCheckedChange={(v) =>
              set("modo_manutencao", v ? "true" : "false")
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="horario">Horário estimado de retorno</Label>
          <Input
            id="horario"
            value={form.horario_manutencao ?? ""}
            onChange={(e) => set("horario_manutencao", e.target.value)}
            placeholder="Ex.: 04h de domingo"
          />
        </div>
      </section>

      {/* Dias de premium por ação */}
      <section className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
        <div>
          <h2 className="text-sm font-bold text-primary">
            Dias de premium por ação
          </h2>
          <p className="text-xs text-muted-foreground">
            Ajuste as recompensas sem redeploy.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoDias
            label="Indicação aceita"
            valor={form.premium_dias_referral ?? ""}
            onChange={(v) => set("premium_dias_referral", v)}
          />
          <CampoDias
            label="Streak 7 dias"
            valor={form.premium_dias_streak ?? ""}
            onChange={(v) => set("premium_dias_streak", v)}
          />
          <CampoDias
            label="Perfil completo"
            valor={form.premium_dias_perfil ?? ""}
            onChange={(v) => set("premium_dias_perfil", v)}
          />
          <CampoDias
            label="Indicado também indicou"
            valor={form.premium_dias_indicado_compartilhou ?? ""}
            onChange={(v) => set("premium_dias_indicado_compartilhou", v)}
          />
        </div>
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Nota: os valores de recompensa são armazenados aqui para gestão. A
          concessão automática segue as regras atuais do motor de recompensas.
        </p>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSalvar} disabled={salvar.isPending}>
          {salvar.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}

function CampoDias({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          dias
        </span>
      </div>
    </div>
  );
}
