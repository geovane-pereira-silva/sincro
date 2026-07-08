import { useState } from "react";
import { UserCog, KeyRound, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useInfoGestor,
  useCriarGestor,
  useResetarSenhaGestor,
} from "@/hooks/use-gestor-admin";
import {
  GestorCredenciaisDialog,
  GestorFormDialog,
  type Credenciais,
} from "@/components/gestor-credenciais-dialog";

export function GestorEmpresaCard({
  empresaId,
  empresaNome,
  emailContato,
}: {
  empresaId: string;
  empresaNome: string;
  emailContato: string | null;
}) {
  const { data: gestor, isLoading } = useInfoGestor(empresaId);
  const criar = useCriarGestor();
  const resetar = useResetarSenhaGestor();
  const [formOpen, setFormOpen] = useState(false);
  const [credOpen, setCredOpen] = useState(false);
  const [cred, setCred] = useState<Credenciais | null>(null);

  async function handleCriar(nome: string, email: string) {
    const r = await criar.mutateAsync({ empresaId, nome, email });
    setCred({ email: r.email, senha: r.senha });
    setFormOpen(false);
    setCredOpen(true);
  }

  async function handleResetar() {
    if (!gestor) return;
    const r = await resetar.mutateAsync({ userId: gestor.userId, empresaId });
    setCred({ email: gestor.email, senha: r.senha });
    setCredOpen(true);
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <UserCog className="h-5 w-5 text-ponto-entrada" />
        <h3 className="text-sm font-bold text-primary">Usuário-gestor</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : gestor ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {gestor.nome}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {gestor.email}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetar}
            disabled={resetar.isPending}
          >
            {resetar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Redefinir senha
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nenhum gestor com login próprio nesta empresa. Gere um acesso para
            que o responsável gerencie os colaboradores.
          </p>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <UserCog className="mr-2 h-4 w-4" /> Gerar acesso do gestor
          </Button>
        </div>
      )}

      <GestorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        nomePadrao={empresaNome}
        emailPadrao={emailContato ?? ""}
        onConfirm={handleCriar}
        loading={criar.isPending}
      />
      <GestorCredenciaisDialog
        open={credOpen}
        onOpenChange={setCredOpen}
        credenciais={cred}
      />
    </div>
  );
}
