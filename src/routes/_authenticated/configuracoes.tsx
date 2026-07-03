import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, KeyRound, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { AppShell } from "@/components/app-shell";
import { usePremium } from "@/components/premium-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mensagemErro } from "@/lib/erros";
import { verificarRecompensasPremium, formatPremiumUntil } from "@/lib/premium";
import { TIMEZONES_BR } from "@/lib/ponto";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — SINCRO" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [profissao, setProfissao] = useState("");
  const [carga, setCarga] = useState("8");
  const [tz, setTz] = useState("America/Sao_Paulo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome_completo ?? "");
      setProfissao(profile.profissao ?? "");
      setCarga(String(profile.carga_horaria_diaria ?? 8));
      setTz(profile.timezone ?? "America/Sao_Paulo");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cargaNum = Number(carga.replace(",", "."));
    if (Number.isNaN(cargaNum) || cargaNum <= 0 || cargaNum > 24) {
      toast.error("Informe uma carga horária válida (entre 0 e 24).");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_completo: nome.trim() || null,
          profissao: profissao.trim() || null,
          carga_horaria_diaria: cargaNum,
          timezone: tz,
        })
        .eq("id", user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Alterações salvas.");
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetSenha() {
    if (!profile?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        profile.email,
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (error) throw error;
      toast.success("Enviamos um link para alterar sua senha por e-mail.");
    } catch (err) {
      toast.error(mensagemErro(err));
    }
  }

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <AppShell profile={profile ?? null}>
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile ?? null}>
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>

        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Perfil
        </p>
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof">Profissão / área de atuação</Label>
            <Input
              id="prof"
              value={profissao}
              onChange={(e) => setProfissao(e.target.value)}
              placeholder="Ex.: Designer, Consultor..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="carga">Carga horária diária (horas)</Label>
            <Input
              id="carga"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={carga}
              onChange={(e) => setCarga(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usada para calcular seu saldo de horas.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tz">Fuso horário</Label>
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger id="tz">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES_BR.map((z) => (
                  <SelectItem key={z.value} value={z.value}>
                    {z.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-xl font-semibold"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </form>

        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Conta
        </p>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={profile?.email ?? ""} disabled />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleResetSenha}
            className="h-11 w-full justify-start rounded-xl border-border"
          >
            <KeyRound className="h-4 w-4" />
            Alterar senha
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="h-11 w-full justify-start rounded-xl border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
