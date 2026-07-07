import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, MessageCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useCriarConvite, useEnviarEmailConvite } from "@/hooks/use-convite-actions";
import type { Setor, JornadaEmpresa } from "@/lib/empresas";
import { tipoJornadaLabel } from "@/lib/empresas";

export function ConviteColaboradorDialog({
  open,
  onOpenChange,
  empresaId,
  empresaNome,
  setores,
  jornadas,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresaId: string;
  empresaNome: string;
  setores: Setor[];
  jornadas: JornadaEmpresa[];
}) {
  const criar = useCriarConvite();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [setorId, setSetorId] = useState("");
  const [jornadaId, setJornadaId] = useState("");
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNome("");
      setEmail("");
      setCpf("");
      setCargo("");
      setSetorId("");
      setJornadaId("");
      setLink(null);
    }
  }, [open]);

  const podeGerar =
    nome.trim().length > 1 &&
    /.+@.+\..+/.test(email.trim()) &&
    !!setorId &&
    !!jornadaId;

  async function gerar() {
    if (!podeGerar) return;
    const r = await criar.mutateAsync({
      empresaId,
      valores: {
        nome_completo: nome.trim(),
        email: email.trim(),
        cpf: cpf.trim() || null,
        cargo: cargo.trim() || null,
        setor_id: setorId,
      },
      jornadaId,
    });
    setLink(`${window.location.origin}/convite/${r.token}`);
    toast.success("Convite gerado!");
  }

  const msgWhats = `Olá ${nome.split(" ")[0] || nome}! 👋 A ${empresaNome} usa o SINCRO para controle de jornada. Crie sua conta com o link abaixo — seus dados já estão preenchidos: ${link}`;
  const emailAssunto = `${empresaNome} te convidou para o SINCRO`;
  const emailCorpo = `Olá ${nome},\n\nSua empresa ${empresaNome} usa o SINCRO para controle de ponto. Clique no link abaixo para criar sua conta — seus dados já estão preenchidos:\n\n${link}\n\nAté já!`;

  function enviarEmail() {
    window.open(
      `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(emailAssunto)}&body=${encodeURIComponent(emailCorpo)}`,
    );
  }
  function enviarWhats() {
    window.open(`https://wa.me/?text=${encodeURIComponent(msgWhats)}`, "_blank");
  }
  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("✓ Link copiado!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {link ? "Convite gerado" : "Convidar colaborador"}
          </DialogTitle>
        </DialogHeader>

        {!link ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cv-nome">Nome completo *</Label>
              <Input
                id="cv-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv-email">Email *</Label>
              <Input
                id="cv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cv-cpf">CPF (opcional)</Label>
                <Input
                  id="cv-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cv-cargo">Cargo (opcional)</Label>
                <Input
                  id="cv-cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Setor *</Label>
                <Select value={setorId} onValueChange={setSetorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jornada *</Label>
                <Select value={jornadaId} onValueChange={setJornadaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {jornadas.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.nome} · {tipoJornadaLabel(j.tipo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(setores.length === 0 || jornadas.length === 0) && (
              <p className="text-xs text-muted-foreground">
                Cadastre ao menos um setor e uma jornada nesta empresa antes de
                convidar.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compartilhe o link abaixo com{" "}
              <span className="font-semibold text-foreground">{nome}</span>. Os
              dados já estarão preenchidos no cadastro.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs">
              <span className="truncate text-foreground">{link}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={enviarEmail}>
                <Mail className="h-4 w-4" /> Email
              </Button>
              <Button variant="outline" onClick={enviarWhats}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
              <Button variant="outline" onClick={copiar}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ponto-entrada">
              <Check className="h-3.5 w-3.5" /> Convite válido por 7 dias.
            </p>
          </div>
        )}

        <DialogFooter>
          {!link ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={gerar} disabled={!podeGerar || criar.isPending}>
                {criar.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Gerar convite
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
