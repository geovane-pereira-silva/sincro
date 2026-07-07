import { useState } from "react";
import { Clock, Loader2, Building2, Check } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { mensagemErro } from "@/lib/erros";
import type { Profile } from "@/lib/ponto";

export function OnboardingScreen({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const isColaborador =
    profile.tipo_conta === "colaborador" && !!profile.empresa_id;

  const { data: empresaNome } = useQuery({
    queryKey: ["onboarding-empresa", profile.empresa_id],
    enabled: isColaborador,
    queryFn: async () => {
      const { data } = await supabase
        .from("empresas")
        .select("nome")
        .eq("id", profile.empresa_id!)
        .maybeSingle();
      return data?.nome ?? null;
    },
  });

  async function concluir() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_concluido: true })
        .eq("id", profile.id);
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["profile", profile.id],
      });
    } catch (err) {
      toast.error(mensagemErro(err));
      setSaving(false);
    }
  }

  if (isColaborador) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
            Bem-vindo ao SINCRO
          </h1>

          {empresaNome && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-ponto-entrada/10 px-4 py-1.5 text-sm font-semibold text-ponto-entrada">
              <Check className="h-4 w-4" /> {empresaNome}
            </div>
          )}

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Você está configurando sua conta como colaborador
            {empresaNome ? (
              <>
                {" "}
                de <span className="font-semibold text-foreground">
                  {empresaNome}
                </span>
              </>
            ) : null}
            . Seus registros de ponto serão vinculados à sua empresa, seguindo a
            jornada definida por ela.
          </p>

          <div className="mt-5 space-y-1 text-left text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Check className="h-4 w-4 text-ponto-entrada" /> Nome:{" "}
              <span className="font-medium text-foreground">
                {profile.nome_completo || "—"}
              </span>
            </p>
            {profile.profissao && (
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ponto-entrada" /> Cargo:{" "}
                <span className="font-medium text-foreground">
                  {profile.profissao}
                </span>
              </p>
            )}
          </div>

          <Button
            onClick={concluir}
            disabled={saving}
            className="mt-8 h-12 w-full rounded-full text-base font-semibold"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Começar a registrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
          Bem-vindo ao SINCRO
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          O SINCRO é sua ferramenta pessoal de controle de jornada. Você
          registra, você edita, você é responsável pelos seus dados. Nós
          guardamos exatamente o que você inseriu.
        </p>

        <Button
          onClick={concluir}
          disabled={saving}
          className="mt-8 h-12 w-full rounded-full text-base font-semibold"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Entendi, vamos começar
        </Button>
      </div>
    </div>
  );
}
