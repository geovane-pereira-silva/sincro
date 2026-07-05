import { SincroMark } from "@/components/sincro-logo";

/** Tela exibida a usuários não-admin quando o modo manutenção está ativo. */
export function MaintenanceScreen({ horario }: { horario?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <SincroMark size={72} className="shadow-soft" />
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-primary">
        Sistema em manutenção
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Estamos fazendo alguns ajustes para melhorar sua experiência. Voltamos
        em breve.
      </p>
      {horario && (
        <p className="mt-4 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground">
          Previsão de retorno: {horario}
        </p>
      )}
    </div>
  );
}
