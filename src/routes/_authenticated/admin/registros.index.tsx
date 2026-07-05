import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminProfiles, useAllBatidas } from "@/hooks/use-admin";
import { useExcluirBatida } from "@/hooks/use-admin-actions";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import {
  EmptyState,
  ListRowsSkeleton,
  TipoPill,
  InitialsAvatar,
} from "@/components/admin-ui";
import { formatDataHora, origemLabel, baixarCsv } from "@/lib/admin";
import { TIPO_INFO, type Tipo } from "@/lib/ponto";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/registros/")({
  head: () => ({ meta: [{ title: "Registros — Admin SINCRO" }] }),
  component: AdminRegistros,
});

const PAGE_SIZE = 50;

function AdminRegistros() {
  const { data: profiles = [] } = useAdminProfiles();
  const { data: batidas = [], isLoading } = useAllBatidas();
  const excluir = useExcluirBatida();

  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<string>("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [soEditados, setSoEditados] = useState(false);
  const [page, setPage] = useState(0);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [aExcluir, setAExcluir] = useState<string | null>(null);

  const nomePorId = useMemo(() => {
    const m = new Map<string, { nome: string; email: string }>();
    for (const p of profiles)
      m.set(p.id, { nome: p.nome_completo ?? "Sem nome", email: p.email });
    return m;
  }, [profiles]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const deMs = de ? new Date(de + "T00:00:00").getTime() : null;
    const ateMs = ate ? new Date(ate + "T23:59:59").getTime() : null;
    return batidas.filter((b) => {
      if (tipo !== "todos" && b.tipo !== tipo) return false;
      if (soEditados && !b.foi_editado) return false;
      const t = new Date(b.data_hora).getTime();
      if (deMs != null && t < deMs) return false;
      if (ateMs != null && t > ateMs) return false;
      if (q) {
        const u = nomePorId.get(b.user_id);
        const alvo = `${u?.nome ?? ""} ${u?.email ?? ""}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [batidas, busca, tipo, de, ate, soEditados, nomePorId]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const visiveis = filtradas.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  );

  function exportar() {
    baixarCsv(
      `registros-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Usuário",
        "E-mail",
        "Data/Hora",
        "Tipo",
        "Editado",
        "Horário original",
        "Justificativa",
        "Origem",
      ],
      filtradas.map((b) => {
        const u = nomePorId.get(b.user_id);
        return [
          u?.nome ?? "",
          u?.email ?? "",
          formatDataHora(b.data_hora),
          TIPO_INFO[b.tipo as Tipo]?.label ?? b.tipo,
          b.foi_editado ? "Sim" : "Não",
          b.foi_editado ? formatDataHora(b.data_hora_original) : "",
          b.justificativa ?? "",
          origemLabel(b.origem),
        ];
      }),
    );
  }

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Registros de Ponto</h1>
          <p className="text-sm text-muted-foreground">
            {filtradas.length}{" "}
            {filtradas.length === 1 ? "batida" : "batidas"}
          </p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={filtradas.length === 0}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => resetPage(setBusca)(e.target.value)}
            placeholder="Buscar usuário…"
            className="h-11 pl-10"
          />
        </div>
        <Select value={tipo} onValueChange={resetPage(setTipo)}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida_intervalo">Saída intervalo</SelectItem>
            <SelectItem value="entrada_intervalo">Entrada intervalo</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={de}
          onChange={(e) => resetPage(setDe)(e.target.value)}
          className="h-11"
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={ate}
          onChange={(e) => resetPage(setAte)(e.target.value)}
          className="h-11"
          aria-label="Data final"
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={soEditados}
            onChange={(e) => resetPage(setSoEditados)(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[hsl(var(--ponto-entrada))]"
          />
          Apenas editados
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        {isLoading ? (
          <div className="px-5">
            <ListRowsSkeleton rows={8} />
          </div>
        ) : visiveis.length === 0 ? (
          <EmptyState
            title="Nenhuma batida encontrada"
            description="Ajuste os filtros para ver os registros."
          />
        ) : (
          <ul className="divide-y divide-border">
            {visiveis.map((b) => {
              const u = nomePorId.get(b.user_id);
              const aberto = expandido === b.id;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => setExpandido(aberto ? null : b.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
                  >
                    <InitialsAvatar
                      name={u?.nome}
                      email={u?.email}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary">
                        {u?.nome ?? "Usuário"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDataHora(b.data_hora)}
                      </p>
                    </div>
                    <TipoPill tipo={b.tipo} />
                    {b.foi_editado && (
                      <span className="hidden items-center gap-1 rounded-full bg-ponto-saida-intervalo/15 px-2 py-0.5 text-[10px] font-bold text-ponto-saida-intervalo sm:inline-flex">
                        <Pencil className="h-3 w-3" /> Editado
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        aberto && "rotate-180",
                      )}
                    />
                  </button>

                  {aberto && (
                    <div className="space-y-3 border-t border-border bg-secondary/40 px-4 py-4 text-sm">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Info label="Origem" valor={origemLabel(b.origem)} />
                        <Info
                          label="Horário original"
                          valor={
                            b.foi_editado
                              ? formatDataHora(b.data_hora_original)
                              : "Não editado"
                          }
                        />
                        <Info
                          label="Horário atual"
                          valor={formatDataHora(b.data_hora)}
                        />
                        <Info
                          label="E-mail"
                          valor={u?.email ?? "—"}
                        />
                      </div>
                      {b.justificativa && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Justificativa
                          </p>
                          <p className="mt-1 text-foreground">
                            {b.justificativa}
                          </p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAExcluir(b.id)}
                        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Excluir batida
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página {pageSafe + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={pageSafe === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={pageSafe >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AdminConfirmDialog
        open={aExcluir != null}
        onOpenChange={(v) => !v && setAExcluir(null)}
        title="Excluir batida"
        description="Esta ação é permanente e será registrada na auditoria."
        confirmLabel="Excluir"
        destructive
        loading={excluir.isPending}
        onConfirm={(motivo) => {
          if (!aExcluir) return;
          excluir.mutate(
            { registroId: aExcluir, motivo },
            { onSuccess: () => setAExcluir(null) },
          );
        }}
      />
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-foreground">{valor}</p>
    </div>
  );
}
