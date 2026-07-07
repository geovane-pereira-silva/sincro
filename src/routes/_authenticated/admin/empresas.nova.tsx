import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmpresaFormDialog } from "@/components/empresa-form-dialog";

export const Route = createFileRoute("/_authenticated/admin/empresas/nova")({
  head: () => ({ meta: [{ title: "Nova empresa — SINCRO Admin" }] }),
  component: NovaEmpresaPage,
});

function NovaEmpresaPage() {
  const navigate = useNavigate();
  return (
    <EmpresaFormDialog
      open
      onOpenChange={(v) => {
        if (!v) navigate({ to: "/admin/empresas" });
      }}
      onSaved={(id) => navigate({ to: "/admin/empresas/$id", params: { id } })}
    />
  );
}
