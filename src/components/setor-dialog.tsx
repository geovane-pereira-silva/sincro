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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSalvarSetor } from "@/hooks/use-empresa-actions";
import type { Setor } from "@/lib/empresas";

export function SetorDialog({
  open,
  onOpenChange,
  empresaId,
  setor,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresaId: string;
  setor?: Setor | null;
}) {
  const salvar = useSalvarSetor();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (open) {
      setNome(setor?.nome ?? "");
      setDescricao(setor?.descricao ?? "");
    }
  }, [open, setor]);

  async function handleSalvar() {
    if (!nome.trim()) return;
    await salvar.mutateAsync({
      id: setor?.id,
      valores: {
        empresa_id: empresaId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{setor ? "Editar setor" : "Novo setor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="setor-nome">Nome *</Label>
            <Input
              id="setor-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Financeiro"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setor-desc">Descrição</Label>
            <Textarea
              id="setor-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={!nome.trim() || salvar.isPending}
          >
            {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
