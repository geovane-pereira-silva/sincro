import { Info, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sanitizeUsername } from "@/lib/username";
import type { UsernameStatus } from "@/hooks/use-cadastro-checks";

export function UsernameField({
  value,
  onChange,
  status,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  status: UsernameStatus;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="username">Usuário</Label>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Sobre o campo usuário"
                className="text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">
              Seu identificador único na plataforma. Usado para login e
              indicações. Exibido sempre em maiúsculas.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative">
        <Input
          id="username"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(sanitizeUsername(e.target.value))}
          placeholder="SEU.USUARIO"
          autoComplete="off"
          className="h-13 pr-9 uppercase"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status === "available" && (
            <Check className="h-4 w-4 text-ponto-entrada" />
          )}
          {(status === "taken" || status === "invalid") && (
            <X className="h-4 w-4 text-destructive" />
          )}
        </span>
      </div>
      {status === "taken" && (
        <p className="text-xs text-destructive">Usuário já em uso</p>
      )}
      {status === "invalid" && value.length > 0 && (
        <p className="text-xs text-destructive">
          3 a 30 caracteres — apenas letras, números, ponto e underline.
        </p>
      )}
      {status === "available" && (
        <p className="text-xs font-medium text-ponto-entrada">Disponível ✓</p>
      )}
    </div>
  );
}
