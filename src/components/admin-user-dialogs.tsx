import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useEditarPerfil,
  useConcederPremiumLote,
} from "@/hooks/use-admin-actions";
import { motivoPremiumLabel } from "@/lib/admin";

export interface EditavelPerfil {
  id: string;
  nome_completo: string | null;
  email: string;
  profissao: string | null;
  carga_horaria_diaria: number;
}

/** Modal de edição de perfil pelo admin. */
export function EditProfileDialog({
  perfil,
  open,
  onOpenChange,
}: {
  perfil: EditavelPerfil | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const editar = useEditarPerfil();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [profissao, setProfissao] = useState("");
  const [carga, setCarga] = useState("8");

  useEffect(() => {
    if (perfil && open) {
      setNome(perfil.nome_completo ?? "");
      setEmail(perfil.email);
      setProfissao(perfil.profissao ?? "");
      setCarga(String(perfil.carga_horaria_diaria ?? 8));
    }
  }, [perfil, open]);

  const cargaNum = Number(carga);
  const valido =
    email.trim().length > 3 &&
    Number.isFinite(cargaNum) &&
    cargaNum > 0 &&
    cargaNum <= 24;

  function handleSalvar() {
    if (!perfil) return;
    editar.mutate(
      {
        userId: perfil.id,
        nome_completo: nome.trim() || null,
        email: email.trim(),
        profissao: profissao.trim() || null,
        carga_horaria_diaria: cargaNum,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Alterações aplicadas com privilégios de administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ed-nome">Nome completo</Label>
            <Input
              id="ed-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-email">E-mail</Label>
            <Input
              id="ed-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-prof">Profissão</Label>
            <Input
              id="ed-prof"
              value={profissao}
              onChange={(e) => setProfissao(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-carga">Carga horária diária (h)</Label>
            <Input
              id="ed-carga"
              type="number"
              step="0.5"
              min={1}
              max={24}
              value={carga}
              onChange={(e) => setCarga(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={editar.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={!valido || editar.isPending}>
            {editar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MOTIVOS = ["admin_manual", "campanha", "erro_sistema"] as const;

/** Modal de concessão de premium para um único usuário. */
export function GrantPremiumDialog({
  userId,
  nome,
  open,
  onOpenChange,
}: {
  userId: string | null;
  nome?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const conceder = useConcederPremiumLote();
  const [dias, setDias] = useState("30");
  const [motivo, setMotivo] = useState<string>("admin_manual");

  const diasNum = Number(dias);
  const valido = Number.isFinite(diasNum) && diasNum > 0;

  function handleConfirmar() {
    if (!userId) return;
    conceder.mutate(
      { userIds: [userId], dias: diasNum, motivo },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder premium</DialogTitle>
          <DialogDescription>
            {nome ? `Para ${nome}.` : "Conceder acesso premium."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gp-dias">Dias</Label>
            <Input
              id="gp-dias"
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {motivoPremiumLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={conceder.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!valido || conceder.isPending}>
            {conceder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Conceder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
