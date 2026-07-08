import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export interface Credenciais {
  email: string;
  senha: string;
}

function CampoCopiavel({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    toast.success(`${label} copiado.`);
    setTimeout(() => setCopiado(false), 1500);
  }
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <code className="flex-1 break-all text-sm font-semibold text-foreground">
          {valor}
        </code>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copiar}>
          {copiado ? (
            <Check className="h-4 w-4 text-ponto-entrada" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function GestorCredenciaisDialog({
  open,
  onOpenChange,
  credenciais,
  titulo = "Acesso do gestor criado",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  credenciais: Credenciais | null;
  titulo?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Repasse estas credenciais ao gestor com segurança. A senha é
            exibida uma única vez — ela não poderá ser consultada novamente.
          </DialogDescription>
        </DialogHeader>

        {credenciais && (
          <div className="space-y-3">
            <CampoCopiavel label="E-mail (login)" valor={credenciais.email} />
            <CampoCopiavel label="Senha provisória" valor={credenciais.senha} />
            <div className="flex items-start gap-2 rounded-lg bg-ponto-saida-intervalo/10 p-3 text-xs text-ponto-saida-intervalo">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Oriente o gestor a trocar a senha no primeiro acesso, em
                Configurações.
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={async () => {
              if (credenciais) {
                await navigator.clipboard.writeText(
                  `Login: ${credenciais.email}\nSenha: ${credenciais.senha}`,
                );
                toast.success("Credenciais copiadas.");
              }
            }}
            variant="secondary"
          >
            Copiar tudo
          </Button>
          <Button onClick={() => onOpenChange(false)}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GestorFormDialog({
  open,
  onOpenChange,
  nomePadrao,
  emailPadrao,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nomePadrao: string;
  emailPadrao: string;
  onConfirm: (nome: string, email: string) => void;
  loading?: boolean;
}) {
  const [nome, setNome] = useState(nomePadrao);
  const [email, setEmail] = useState(emailPadrao);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setNome(nomePadrao);
          setEmail(emailPadrao);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar acesso do gestor</DialogTitle>
          <DialogDescription>
            Cria um login próprio para o responsável gerenciar os colaboradores
            desta empresa. Uma senha provisória será gerada automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Nome do gestor
            </label>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              E-mail (login)
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestor@empresa.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={loading || !nome.trim() || !email.trim()}
            onClick={() => onConfirm(nome.trim(), email.trim())}
          >
            {loading ? "Criando…" : "Criar acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
