import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, ChevronRight, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCriarSolicitacao } from "@/hooks/use-solicitacoes";
import {
  TIPO_SOLICITACAO_LABEL,
  TIPO_SOLICITACAO_DESC,
  TIPO_BATIDA_LABEL,
  type TipoSolicitacao,
} from "@/lib/solicitacoes";
import { mensagemErro } from "@/lib/erros";

const TIPOS: TipoSolicitacao[] = [
  "ajuste_ponto",
  "abono",
  "hora_extra",
  "ferias",
  "folga",
];

const hoje = () => new Date().toISOString().slice(0, 10);

export function NovaSolicitacaoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const criar = useCriarSolicitacao();

  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<TipoSolicitacao | null>(null);
  const [dataRef, setDataRef] = useState(hoje());
  const [dataInicio, setDataInicio] = useState(hoje());
  const [dataFim, setDataFim] = useState(hoje());
  const [horario, setHorario] = useState("");
  const [tipoBatida, setTipoBatida] = useState("entrada");
  const [motivo, setMotivo] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const isPeriodo = tipo === "ferias" || tipo === "folga";

  function reset() {
    setStep(1);
    setTipo(null);
    setDataRef(hoje());
    setDataInicio(hoje());
    setDataFim(hoje());
    setHorario("");
    setTipoBatida("entrada");
    setMotivo("");
    setAnexo(null);
  }

  function fechar(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function enviar() {
    if (!tipo || !user?.id) return;
    if (!motivo.trim()) {
      toast.error("Descreva o motivo da solicitação.");
      return;
    }
    setEnviando(true);
    try {
      let anexoUrl: string | null = null;
      if (anexo) {
        const ext = anexo.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("anexos-solicitacoes")
          .upload(path, anexo);
        if (upErr) throw upErr;
        anexoUrl = path;
      }

      await criar.mutateAsync({
        tipo,
        data_referencia: isPeriodo ? dataInicio : dataRef,
        data_inicio: isPeriodo ? dataInicio : null,
        data_fim: isPeriodo ? dataFim : null,
        horario_solicitado:
          tipo === "ajuste_ponto" && horario ? horario : null,
        tipo_batida: tipo === "ajuste_ponto" ? tipoBatida : null,
        motivo: motivo.trim(),
        anexo_url: anexoUrl,
      });
      toast.success("Solicitação enviada ao gestor.");
      fechar(false);
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova solicitação</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="mb-2 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  step >= n
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 3 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded",
                    step > n ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — tipo */}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Qual o tipo de solicitação?
            </p>
            <div className="grid gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTipo(t);
                    setStep(2);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary",
                    tipo === t && "border-primary bg-primary/5",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {TIPO_SOLICITACAO_LABEL[t]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TIPO_SOLICITACAO_DESC[t]}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — detalhes */}
        {step === 2 && tipo && (
          <div className="space-y-4">
            {isPeriodo ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Data de referência</Label>
                <Input
                  type="date"
                  value={dataRef}
                  onChange={(e) => setDataRef(e.target.value)}
                />
              </div>
            )}

            {tipo === "ajuste_ponto" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Batida</Label>
                  <Select value={tipoBatida} onValueChange={setTipoBatida}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_BATIDA_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Horário correto</Label>
                  <Input
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Motivo / justificativa</Label>
              <Textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique o motivo da solicitação..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Anexo (opcional)</Label>
              {anexo ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="truncate">{anexo.name}</span>
                  <button onClick={() => setAnexo(null)}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary">
                  <Upload className="h-4 w-4" />
                  Anexar atestado ou comprovante
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => setAnexo(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Revisar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — revisão */}
        {step === 3 && tipo && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
              <Linha rotulo="Tipo" valor={TIPO_SOLICITACAO_LABEL[tipo]} />
              {isPeriodo ? (
                <Linha rotulo="Período" valor={`${dataInicio} a ${dataFim}`} />
              ) : (
                <Linha rotulo="Data" valor={dataRef} />
              )}
              {tipo === "ajuste_ponto" && (
                <Linha
                  rotulo="Batida"
                  valor={`${TIPO_BATIDA_LABEL[tipoBatida]}${horario ? ` às ${horario}` : ""}`}
                />
              )}
              <Linha rotulo="Motivo" valor={motivo || "—"} />
              {anexo && <Linha rotulo="Anexo" valor={anexo.name} />}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={enviar}
                disabled={enviando}
              >
                {enviando && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar solicitação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{rotulo}</span>
      <span className="flex-1 font-medium">{valor}</span>
    </div>
  );
}
