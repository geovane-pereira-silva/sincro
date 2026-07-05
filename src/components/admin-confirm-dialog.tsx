import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Diálogo de confirmação para ações administrativas.
 * Quando `exigirMotivo` é verdadeiro, o botão de confirmação só habilita
 * após o admin preencher a justificativa (registrada na auditoria).
 */
export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive = false,
  exigirMotivo = true,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  exigirMotivo?: boolean;
  loading?: boolean;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");

  const podeConfirmar = !loading && (!exigirMotivo || motivo.trim().length > 0);

  function handleOpenChange(v: boolean) {
    if (!v) setMotivo("");
    onOpenChange(v);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {exigirMotivo && (
          <div className="space-y-1.5">
            <Label htmlFor="admin-motivo">Motivo (obrigatório)</Label>
            <Textarea
              id="admin-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo desta ação…"
              rows={3}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button
            disabled={!podeConfirmar}
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(motivo.trim())}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
