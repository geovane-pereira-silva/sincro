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
import { Loader2 } from "lucide-react";
import { useSalvarColaborador } from "@/hooks/use-empresa-actions";
import type { Colaborador, Setor, JornadaEmpresa } from "@/lib/empresas";
import { tipoJornadaLabel } from "@/lib/empresas";

const SEM_VALOR = "__none__";

export function ColaboradorDialog({
  open,
  onOpenChange,
  empresaId,
  setores,
  jornadas,
  colaborador,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresaId: string;
  setores: Setor[];
  jornadas: JornadaEmpresa[];
  colaborador?: Colaborador | null;
}) {
  const salvar = useSalvarColaborador();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cargo, setCargo] = useState("");
  const [setorId, setSetorId] = useState(SEM_VALOR);
  const [jornadaId, setJornadaId] = useState(SEM_VALOR);
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [foto, setFoto] = useState("");

  useEffect(() => {
    if (open) {
      setNome(colaborador?.nome_completo ?? "");
      setCpf(colaborador?.cpf ?? "");
      setEmail(colaborador?.email ?? "");
      setMatricula(colaborador?.matricula ?? "");
      setCargo(colaborador?.cargo ?? "");
      setSetorId(colaborador?.setor_id ?? SEM_VALOR);
      setJornadaId(SEM_VALOR);
      setDataAdmissao(colaborador?.data_admissao ?? "");
      setFoto(colaborador?.foto_url ?? "");
    }
  }, [open, colaborador]);

  async function handleSalvar() {
    if (!nome.trim()) return;
    await salvar.mutateAsync({
      id: colaborador?.id,
      valores: {
        empresa_id: empresaId,
        nome_completo: nome.trim(),
        cpf: cpf.trim() || null,
        email: email.trim() || null,
        matricula: matricula.trim() || null,
        cargo: cargo.trim() || null,
        setor_id: setorId === SEM_VALOR ? null : setorId,
        data_admissao: dataAdmissao || null,
        foto_url: foto.trim() || null,
      },
      jornadaId: jornadaId === SEM_VALOR ? null : jornadaId,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {colaborador ? "Editar colaborador" : "Adicionar colaborador"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="col-nome">Nome completo *</Label>
            <Input
              id="col-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="col-cpf">CPF</Label>
              <Input
                id="col-cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-mat">Matrícula</Label>
              <Input
                id="col-mat"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="col-email">Email</Label>
              <Input
                id="col-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-cargo">Cargo</Label>
              <Input
                id="col-cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Setor</Label>
              <Select value={setorId} onValueChange={setSetorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_VALOR}>Sem setor</SelectItem>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jornada</Label>
              <Select value={jornadaId} onValueChange={setJornadaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_VALOR}>Sem jornada</SelectItem>
                  {jornadas.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nome} · {tipoJornadaLabel(j.tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="col-adm">Data de admissão</Label>
              <Input
                id="col-adm"
                type="date"
                value={dataAdmissao}
                onChange={(e) => setDataAdmissao(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-foto">Foto (URL)</Label>
              <Input
                id="col-foto"
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
                placeholder="https://…"
              />
            </div>
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
