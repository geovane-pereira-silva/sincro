import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLANO_FILTRO_OPCOES } from "@/hooks/use-plan-filter";
import {
  PERIODO_OPCOES,
  ORIGEM_OPCOES,
  STATUS_OPCOES,
  presetRange,
  type FiltrosRelatorio,
  type PeriodoPreset,
} from "@/lib/relatorios";
import type { Empresa } from "@/lib/empresas";

export function RelatorioFiltros({
  draft,
  setDraft,
  empresas,
  onAplicar,
  onLimpar,
}: {
  draft: FiltrosRelatorio;
  setDraft: (f: FiltrosRelatorio) => void;
  empresas: Empresa[];
  onAplicar: () => void;
  onLimpar: () => void;
}) {
  const set = <K extends keyof FiltrosRelatorio>(
    k: K,
    v: FiltrosRelatorio[K],
  ) => setDraft({ ...draft, [k]: v });

  const setPreset = (preset: PeriodoPreset) => {
    if (preset === "personalizado") {
      setDraft({ ...draft, preset });
    } else {
      const r = presetRange(preset);
      setDraft({ ...draft, preset, inicio: r.inicio, fim: r.fim });
    }
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card md:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Período */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={draft.preset} onValueChange={(v) => setPreset(v as PeriodoPreset)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODO_OPCOES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Datas personalizadas */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input
            type="date"
            value={draft.inicio}
            max={draft.fim}
            onChange={(e) =>
              setDraft({ ...draft, preset: "personalizado", inicio: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input
            type="date"
            value={draft.fim}
            min={draft.inicio}
            onChange={(e) =>
              setDraft({ ...draft, preset: "personalizado", fim: e.target.value })
            }
          />
        </div>

        {/* Plano */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Plano</Label>
          <Select value={draft.plano} onValueChange={(v) => set("plano", v as FiltrosRelatorio["plano"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANO_FILTRO_OPCOES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Origem */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Origem</Label>
          <Select value={draft.origem} onValueChange={(v) => set("origem", v as FiltrosRelatorio["origem"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIGEM_OPCOES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={draft.status} onValueChange={(v) => set("status", v as FiltrosRelatorio["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPCOES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Empresa */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Empresa</Label>
          <Select value={draft.empresa} onValueChange={(v) => set("empresa", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="autonomos">Apenas autônomos</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onAplicar} className="gap-2">
          <Filter className="h-4 w-4" /> Aplicar filtros
        </Button>
        <Button variant="outline" onClick={onLimpar} className="gap-2">
          <X className="h-4 w-4" /> Limpar filtros
        </Button>
      </div>
    </div>
  );
}
