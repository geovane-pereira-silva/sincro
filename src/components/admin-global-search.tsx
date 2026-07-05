import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminProfiles } from "@/hooks/use-admin";
import { InitialsAvatar } from "@/components/admin-ui";

/**
 * Busca global do admin: nome, e-mail e código de indicação.
 * Resultados linkam direto para o detalhe do usuário.
 */
export function AdminGlobalSearch({ className }: { className?: string }) {
  const { data: profiles = [] } = useAdminProfiles();
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);

  const resultados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return [];
    return profiles
      .filter(
        (p) =>
          (p.nome_completo ?? "").toLowerCase().includes(termo) ||
          p.email.toLowerCase().includes(termo) ||
          (p.referral_code ?? "").toLowerCase().includes(termo),
      )
      .slice(0, 8);
  }, [profiles, q]);

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/60" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder="Buscar usuário…"
          className="h-10 border-white/20 bg-white/10 pl-9 pr-8 text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-white/40"
        />
        {q && (
          <button
            aria-label="Limpar busca"
            onClick={() => {
              setQ("");
              setAberto(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-foreground/60 hover:text-primary-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {aberto && q.trim() && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setAberto(false)}
          />
          <div className="absolute z-50 mt-2 max-h-80 w-[min(360px,calc(100vw-2rem))] overflow-auto rounded-xl border border-border bg-card p-1 text-foreground shadow-soft">
            {resultados.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </p>
            ) : (
              resultados.map((p) => (
                <Link
                  key={p.id}
                  to="/admin/usuarios/$id"
                  params={{ id: p.id }}
                  onClick={() => {
                    setAberto(false);
                    setQ("");
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary"
                >
                  <InitialsAvatar
                    name={p.nome_completo}
                    email={p.email}
                    size={34}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">
                      {p.nome_completo || "Sem nome"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.email}
                      {p.referral_code ? ` · ${p.referral_code}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    <User className="h-3 w-3" /> usuário
                  </span>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
