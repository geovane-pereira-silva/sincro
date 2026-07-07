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
import { useSalvarEmpresa } from "@/hooks/use-empresa-actions";
import { PLANO_EMPRESA_LABEL, type Empresa } from "@/lib/empresas";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresa?: Empresa | null;
  onSaved?: (id: string) => void;
}

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Recife",
  "America/Cuiaba",
  "America/Rio_Branco",
];

export function EmpresaFormDialog({
  open,
  onOpenChange,
  empresa,
  onSaved,
}: Props) {
  const salvar = useSalvarEmpresa();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [plano, setPlano] = useState("start");
  const [maxColab, setMaxColab] = useState("15");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    if (open) {
      setNome(empresa?.nome ?? "");
      setCnpj(empresa?.cnpj ?? "");
      setEmail(empresa?.email_contato ?? "");
      setTelefone(empresa?.telefone ?? "");
      setPlano(empresa?.plano ?? "start");
      setMaxColab(String(empresa?.max_colaboradores ?? 15));
      setTimezone(empresa?.timezone ?? "America/Sao_Paulo");
      setLogo(empresa?.logo_url ?? "");
    }
  }, [open, empresa]);

  async function handleSalvar() {
    if (!nome.trim()) return;
    const valores = {
      nome: nome.trim(),
      cnpj: cnpj.trim() || null,
      email_contato: email.trim() || null,
      telefone: telefone.trim() || null,
      plano,
      max_colaboradores: Number(maxColab) || 15,
      timezone,
      logo_url: logo.trim() || null,
    };
    const res = await salvar.mutateAsync({ id: empresa?.id, valores });
    onOpenChange(false);
    if (res?.id) onSaved?.(res.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {empresa ? "Editar empresa" : "Nova empresa"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emp-nome">Nome *</Label>
            <Input
              id="emp-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-cnpj">CNPJ</Label>
              <Input
                id="emp-cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-tel">Telefone</Label>
              <Input
                id="emp-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-email">Email de contato</Label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@empresa.com"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              <Select value={plano} onValueChange={setPlano}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLANO_EMPRESA_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-max">Máx. colaboradores</Label>
              <Input
                id="emp-max"
                type="number"
                min={1}
                value={maxColab}
                onChange={(e) => setMaxColab(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-logo">Logo (URL)</Label>
            <Input
              id="emp-logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://…"
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
