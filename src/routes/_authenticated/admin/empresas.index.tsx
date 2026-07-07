import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ListRowsSkeleton, InitialsAvatar } from "@/components/admin-ui";
import { EmpresaFormDialog } from "@/components/empresa-form-dialog";
import { useEmpresas, useColaboradoresCount } from "@/hooks/use-empresas";
import {
  PLANO_EMPRESA_LABEL,
  PLANO_EMPRESA_CLASSE,
  planoEmpresaLabel,
  fmtCnpj,
  fmtDataBr,
  type PlanoEmpresa,
} from "@/lib/empresas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/empresas/")({
  head: () => ({ meta: [{ title: "Empresas — SINCRO Admin" }] }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const navigate = useNavigate();
  const { data: empresas = [], isLoading } = useEmpresas();
  const { data: counts = {} } = useColaboradoresCount();
  const [busca, setBusca] = useState("");
  const [planoFiltro, setPlanoFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [novaOpen, setNovaOpen] = useState(false);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return empresas.filter((e) => {
      if (planoFiltro !== "todos" && e.plano !== planoFiltro) return false;
      if (statusFiltro === "ativa" && !e.ativo) return false;
      if (statusFiltro === "inativa" && e.ativo) return false;
      if (q) {
        const alvo = `${e.nome} ${e.cnpj ?? ""}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [empresas, busca, planoFiltro, statusFiltro]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Empresas</h1>
          <p className="text-sm text-muted-foreground">
            {empresas.length} empresa(s) cadastrada(s)
          </p>
        </div>
        <Button onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4" /> Nova empresa
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou CNPJ…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={planoFiltro} onValueChange={setPlanoFiltro}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os planos</SelectItem>
            {Object.entries(PLANO_EMPRESA_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativa">Ativas</SelectItem>
            <SelectItem value="inativa">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl bg-card p-3 shadow-card md:p-4">
        {isLoading ? (
          <ListRowsSkeleton rows={6} />
        ) : filtradas.length === 0 ? (
          <EmptyState
            title="Nenhuma empresa encontrada"
            description="Cadastre a primeira empresa para começar a gerenciar colaboradores e jornadas."
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtradas.map((e) => {
              const total = counts[e.id] ?? 0;
              return (
                <li key={e.id}>
                  <button
                    onClick={() =>
                      navigate({
                        to: "/admin/empresas/$id",
                        params: { id: e.id },
                      })
                    }
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    {e.logo_url ? (
                      <img
                        src={e.logo_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <InitialsAvatar name={e.nome} size={40} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary">
                        {e.nome}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {fmtCnpj(e.cnpj)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline",
                        PLANO_EMPRESA_CLASSE[e.plano as PlanoEmpresa],
                      )}
                    >
                      {planoEmpresaLabel(e.plano)}
                    </span>
                    <span className="hidden w-20 shrink-0 text-center text-xs text-muted-foreground sm:block">
                      {total}/{e.max_colaboradores}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                        e.ativo
                          ? "bg-ponto-entrada/15 text-ponto-entrada"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {e.ativo ? "Ativa" : "Inativa"}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground md:block">
                      {fmtDataBr(e.created_at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EmpresaFormDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onSaved={(id) =>
          navigate({ to: "/admin/empresas/$id", params: { id } })
        }
      />
    </div>
  );
}
