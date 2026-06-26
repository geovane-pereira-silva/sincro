import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsSuperadmin } from "@/hooks/use-is-superadmin";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SINCRO" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();
  const { data: isAdmin, isLoading } = useIsSuperadmin(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin === false) {
      navigate({ to: "/ponto", replace: true });
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
