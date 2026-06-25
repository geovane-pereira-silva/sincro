import { useEffect } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/ref/$code")({
  component: RefPage,
});

function RefPage() {
  const navigate = useNavigate();
  const { code } = useParams({ from: "/ref/$code" });

  useEffect(() => {
    const limpo = (code ?? "").trim().toUpperCase();
    if (limpo) {
      try {
        sessionStorage.setItem("ref_code", limpo);
      } catch {
        // ignora indisponibilidade de storage
      }
    }
    navigate({ to: "/auth", replace: true });
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
