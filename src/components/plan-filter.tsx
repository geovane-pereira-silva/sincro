import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePlanFilter,
  PLANO_FILTRO_OPCOES,
  type PlanoFiltro,
} from "@/hooks/use-plan-filter";
import { cn } from "@/lib/utils";

/**
 * Filtro global de plano, persistido em localStorage e compartilhado
 * entre todas as telas do admin que listam usuários.
 */
export function PlanFilter({
  value,
  onChange,
  className,
}: {
  value: PlanoFiltro;
  onChange: (v: PlanoFiltro) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PlanoFiltro)}>
      <SelectTrigger className={cn("w-full sm:w-[180px]", className)}>
        <SelectValue placeholder="Plano" />
      </SelectTrigger>
      <SelectContent>
        {PLANO_FILTRO_OPCOES.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { usePlanFilter };
