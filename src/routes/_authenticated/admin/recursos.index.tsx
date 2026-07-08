import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Check,
  Webhook,
  Link2,
  FileText,
  Calculator,
  KeyRound,
  ShieldCheck,
  UserPlus,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton, EmptyState } from "@/components/admin-ui";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { useAdminProfiles } from "@/hooks/use-admin";
import { useAdmins, useConcederAdmin, useRevogarAdmin } from "@/hooks/use-admins";

export const Route = createFileRoute("/_authenticated/admin/recursos/")({
  head: () => ({ meta: [{ title: "Recursos — Admin SINCRO" }] }),
  component: RecursosPage,
});

const PROD = "https://sincroapp.lovable.app";
const PREVIEW = "https://project--7e6df5cf-2613-4115-97a6-b4b53921cd1b-dev.lovable.app";

interface LinkItem {
  label: string;
  value: string;
  hint?: string;
  external?: boolean;
}

const WEBHOOKS: LinkItem[] = [
  {
    label: "Webhook Asaas (produção)",
    value: `${PROD}/api/public/asaas/webhook`,
    hint: "Cole em Asaas → Integrações → Webhooks. Header asaas-access-token = ASAAS_WEBHOOK_TOKEN.",
  },
  {
    label: "Webhook Asaas (preview / sandbox)",
    value: `${PREVIEW}/api/public/asaas/webhook`,
    hint: "Use durante testes com o ambiente sandbox do Asaas.",
  },
];

const LINKS: LinkItem[] = [
  { label: "App publicado", value: PROD, external: true },
  { label: "App preview (dev)", value: PREVIEW, external: true },
  {
    label: "Página de planos",
    value: `${PROD}/planos`,
    external: true,
  },
];

const SEGREDOS = [
  { nome: "ASAAS_API_KEY", desc: "Chave da API do Asaas (cobranças)." },
  { nome: "ASAAS_WEBHOOK_TOKEN", desc: "Token que valida o webhook do Asaas." },
  { nome: "RESEND_API_KEY", desc: "Envio de e-mails transacionais (convites)." },
  { nome: "LOVABLE_API_KEY", desc: "Gateway de IA da Lovable (gerenciada)." },
];

const DOCS: { icon: typeof FileText; label: string; path: string; desc: string }[] =
  [
    {
      icon: FileText,
      label: "Plano do produto",
      path: ".lovable/plan.md",
      desc: "Visão geral, funcionalidades e modelo de dados do SINCRO.",
    },
    {
      icon: FileText,
      label: "Confirmação de e-mail",
      path: "docs/email-confirmacao-conta.md",
      desc: "Passo a passo da configuração de templates de e-mail.",
    },
    {
      icon: FileText,
      label: "README",
      path: "README.md",
      desc: "Instruções técnicas e stack do projeto.",
    },
    {
      icon: Calculator,
      label: "Algoritmo de ponto",
      path: "src/lib/ponto.ts",
      desc: "Cálculo de jornada, intervalos, saldo e streak (fuso-aware).",
    },
    {
      icon: Calculator,
      label: "Cálculo trabalhista",
      path: "src/lib/calculoTrabalhista.ts",
      desc: "Regras de horas extras, adicionais e banco de horas.",
    },
    {
      icon: Webhook,
      label: "Integração Asaas",
      path: "src/lib/asaas.server.ts",
      desc: "Cliente server-side: clientes, assinaturas e cobranças.",
    },
  ];

function CopyRow({ item }: { item: LinkItem }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopied(true);
      toast.success("Copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {item.label}
        </span>
        <div className="flex items-center gap-1">
          {item.external && (
            <a
              href={item.value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              title="Abrir"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={copy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            title="Copiar"
          >
            {copied ? (
              <Check className="h-4 w-4 text-ponto-entrada" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
        {item.value}
      </p>
      {item.hint && (
        <p className="mt-1.5 text-xs text-muted-foreground">{item.hint}</p>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function AdminManager() {
  const { data: admins, isLoading } = useAdmins();
  const { data: profiles } = useAdminProfiles();
  const conceder = useConcederAdmin();
  const revogar = useRevogarAdmin();
  const [selecionado, setSelecionado] = useState("");
  const [remover, setRemover] = useState<{ id: string; nome: string } | null>(
    null,
  );

  const adminIds = useMemo(
    () => new Set((admins ?? []).map((a) => a.user_id)),
    [admins],
  );
  const candidatos = useMemo(
    () => (profiles ?? []).filter((p) => !adminIds.has(p.id)),
    [profiles, adminIds],
  );

  return (
    <Section icon={ShieldCheck} title="Administradores do sistema">
      <p className="text-sm text-muted-foreground">
        Administradores têm acesso total ao painel. Você pode promover qualquer
        usuário cadastrado.
      </p>

      {/* Promover */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selecionado} onValueChange={setSelecionado}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecionar usuário para promover…" />
          </SelectTrigger>
          <SelectContent>
            {candidatos.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Nenhum usuário disponível
              </div>
            ) : (
              candidatos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome_completo || p.email}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          disabled={!selecionado || conceder.isPending}
          onClick={() =>
            conceder.mutate(
              { userId: selecionado },
              { onSuccess: () => setSelecionado("") },
            )
          }
        >
          {conceder.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Adicionar admin
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <CardSkeleton />
      ) : (admins ?? []).length === 0 ? (
        <EmptyState title="Nenhum administrador" />
      ) : (
        <ul className="space-y-2">
          {(admins ?? []).map((a) => (
            <li
              key={a.user_id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {a.nome_completo || "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() =>
                  setRemover({
                    id: a.user_id,
                    nome: a.nome_completo || a.email,
                  })
                }
                title="Remover admin"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AdminConfirmDialog
        open={!!remover}
        onOpenChange={(v) => !v && setRemover(null)}
        title="Remover administrador"
        description={`Remover o acesso de administrador de ${remover?.nome}?`}
        confirmLabel="Remover"
        destructive
        loading={revogar.isPending}
        onConfirm={() => {
          if (remover)
            revogar.mutate(
              { userId: remover.id },
              { onSuccess: () => setRemover(null) },
            );
        }}
      />
    </Section>
  );
}

function RecursosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Documentos, links e integrações que você pode precisar como criador do
          sistema.
        </p>
      </div>

      <Section icon={Webhook} title="Webhooks">
        <div className="space-y-2">
          {WEBHOOKS.map((w) => (
            <CopyRow key={w.label} item={w} />
          ))}
        </div>
      </Section>

      <Section icon={Link2} title="Links úteis">
        <div className="space-y-2">
          {LINKS.map((l) => (
            <CopyRow key={l.label} item={l} />
          ))}
        </div>
      </Section>

      <Section icon={FileText} title="Documentação & algoritmo">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DOCS.map((d) => (
            <div
              key={d.path}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <d.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {d.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{d.desc}</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
                {d.path}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={KeyRound} title="Segredos configurados">
        <p className="text-sm text-muted-foreground">
          Guardados com segurança no backend (nunca expostos no navegador).
        </p>
        <ul className="space-y-2">
          {SEGREDOS.map((s) => (
            <li
              key={s.nome}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {s.nome}
                </p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <AdminManager />
    </div>
  );
}
