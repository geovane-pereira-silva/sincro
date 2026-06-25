import { useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { mensagemErro } from "@/lib/erros";
import type { Profile } from "@/lib/ponto";

export function OnboardingScreen({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function concluir() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_concluido: true })
        .eq("id", profile.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
    } catch (err) {
      toast.error(mensagemErro(err));
      setSaving(false);
    }
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
