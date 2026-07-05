import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, History, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminProfiles, useAuditLog } from "@/hooks/use-admin";
import {
  EmptyState,
  ListRowsSkeleton,
  InitialsAvatar,
} from "@/components/admin-ui";
import { formatDataHora } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/suporte/")({
  head: () => ({ meta: [{ title: "Suporte — Admin SINCRO" }] }),
  component: AdminSuporte,
});

const ACAO_LABEL: Record<string, string> = {
  editar_perfil: "Editou perfil",
  bloquear_conta: "Bloqueou conta",
  desbloquear_conta: "Desbloqueou conta",
  conceder_premium: "Concedeu premium",
  revogar_premium: "Revogou premium",
  excluir_batida: "Excluiu batida",
};

function AdminSuporte() {
  const { data: profiles = [] } = useAdminProfiles();
  const { data: log = [], isLoading } = useAuditLog();
  const [busca, setBusca] = useState("");

  const nomePorId = useMemo(() => {
    const m = new Map<string, { nome: string; email: string }>();
    for (const p of profiles)
      m.set(p.id, { nome: p.nome_completo ?? "Sem nome", email: p.email });
    return m;
  }, [profiles]);

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    return profiles
      .filter(
        (p) =>
          (p.nome_completo ?? "").toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.referral_code ?? "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [profiles, busca]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Suporte</h1>
        <p className="text-sm text-muted-foreground">
          Busque usuários e acompanhe as ações administrativas.
        </p>
      </div>

      {/* Busca */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou código de indicação…"
            className="h-12 pl-10"
          />
        </div>

        {busca.trim() && (
          <ul className="mt-3 divide-y divide-border">
            {resultados.length === 0 ? (
              <li className="py-4 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </li>
            ) : (
              resultados.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: p.id }}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <InitialsAvatar
                      name={p.nome_completo}
                      email={p.email}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary hover:underline">
                        {p.nome_completo || "Sem nome"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.email}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      <User className="h-3 w-3" /> usuário
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Feed de auditoria */}
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <History className="h-4 w-4 text-ponto-entrada" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Atividade administrativa
          </h2>
        </div>
        {isLoading ? (
          <div className="px-5">
            <ListRowsSkeleton rows={6} />
          </div>
        ) : log.length === 0 ? (
          <EmptyState
            title="Nenhuma ação registrada"
            description="As ações administrativas aparecerão aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {log.slice(0, 100).map((l) => {
              const alvo = nomePorId.get(l.registro_id);
              return (
                <li key={l.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-primary">
                      {ACAO_LABEL[l.acao] ?? l.acao}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDataHora(l.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {l.tabela}
                    {alvo ? ` · ${alvo.nome}` : ""}
                    {l.motivo ? ` — ${l.motivo}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
