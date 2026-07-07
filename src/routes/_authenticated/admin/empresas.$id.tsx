import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  UserCheck,
  Layers,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Ban,
  RotateCcw,
  Search,
  UserPlus,
  Send,
  Download,
  History,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyState,
  ListRowsSkeleton,
  CardSkeleton,
  InitialsAvatar,
} from "@/components/admin-ui";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { EmpresaFormDialog } from "@/components/empresa-form-dialog";
import { SetorDialog } from "@/components/setor-dialog";
import { ColaboradorDialog } from "@/components/colaborador-dialog";
import { ConviteColaboradorDialog } from "@/components/convite-colaborador-dialog";
import { JornadaDialog } from "@/components/jornada-dialog";
import {
  useEmpresa,
  useSetores,
  useColaboradores,
  useJornadasEmpresa,
  useEmpresaBatidas,
} from "@/hooks/use-empresas";
import {
  useExcluirEmpresa,
  useExcluirSetor,
  useExcluirColaborador,
  useToggleColaborador,
  useExcluirJornada,
  useDuplicarJornada,
} from "@/hooks/use-empresa-actions";
import {
  useReenviarConvite,
  useEnviarEmailConvite,
} from "@/hooks/use-convite-actions";
import {
  TIPO_JORNADA_CLASSE,
  tipoJornadaLabel,
  planoEmpresaLabel,
  diasConfigurados,
  statusConvite,
  colaboradorStatus,
  fmtDataBr,
  type Setor,
  type Colaborador,
  type JornadaEmpresa,
} from "@/lib/empresas";
import { montarCsv, baixarCsv } from "@/lib/relatorios";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/empresas/$id")({
  head: () => ({ meta: [{ title: "Empresa — SINCRO Admin" }] }),
  component: EmpresaDetalhe,
});

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <Icon className="h-5 w-5 text-ponto-entrada" />
      <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmpresaDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: empresa, isLoading } = useEmpresa(id);
  const { data: setores = [], isLoading: ls } = useSetores(id);
  const { data: colaboradores = [], isLoading: lc } = useColaboradores(id);
  const { data: jornadas = [], isLoading: lj } = useJornadasEmpresa(id);
  const { data: batidas = [] } = useEmpresaBatidas(id, 30);

  const [editEmpresa, setEditEmpresa] = useState(false);
  const [excluirEmpresaOpen, setExcluirEmpresaOpen] = useState(false);
  const excluirEmpresaMut = useExcluirEmpresa();

  const ativos = colaboradores.filter((c) => c.ativo).length;

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const b of batidas) {
      const k = b.data_hora.slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([dia, total]) => ({
      dia: dia.slice(8, 10) + "/" + dia.slice(5, 7),
      total,
    }));
  }, [batidas]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!empresa) {
    return (
      <EmptyState
        title="Empresa não encontrada"
        description="Ela pode ter sido removida."
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate({ to: "/admin/empresas" })}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Empresas
      </button>

      <div className="flex items-center gap-3">
        {empresa.logo_url ? (
          <img
            src={empresa.logo_url}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar name={empresa.nome} size={48} />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-primary">
            {empresa.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {planoEmpresaLabel(empresa.plano)} ·{" "}
            {empresa.ativo ? "Ativa" : "Inativa"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="visao">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="setores">Setores</TabsTrigger>
          <TabsTrigger value="jornadas">Jornadas</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="visao" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} value={colaboradores.length} label="Colaboradores" />
            <StatCard icon={UserCheck} value={ativos} label="Ativos" />
            <StatCard icon={Layers} value={setores.length} label="Setores" />
            <StatCard icon={CalendarClock} value={jornadas.length} label="Jornadas" />
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Batidas — últimos 30 dias
            </h2>
            {batidas.length === 0 ? (
              <EmptyState
                title="Sem batidas registradas"
                description="Os colaboradores desta empresa ainda não têm registros de ponto."
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval={4} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--ponto-entrada))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        {/* COLABORADORES */}
        <TabsContent value="colaboradores">
          <ColaboradoresTab
            empresaId={id}
            empresaNome={empresa.nome}
            setores={setores}
            jornadas={jornadas}
            colaboradores={colaboradores}
            loading={lc}
          />
        </TabsContent>

        {/* SETORES */}
        <TabsContent value="setores">
          <SetoresTab
            empresaId={id}
            setores={setores}
            colaboradores={colaboradores}
            loading={ls}
          />
        </TabsContent>

        {/* JORNADAS */}
        <TabsContent value="jornadas">
          <JornadasTab empresaId={id} jornadas={jornadas} loading={lj} />
        </TabsContent>

        {/* CONFIGURAÇÕES */}
        <TabsContent value="config" className="space-y-4">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold text-primary">
              Dados da empresa
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Edite nome, plano, limite de colaboradores, logo e demais dados.
            </p>
            <Button className="mt-4" onClick={() => setEditEmpresa(true)}>
              <Pencil className="h-4 w-4" /> Editar dados
            </Button>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold text-destructive">
              Zona de perigo
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Excluir a empresa remove todos os setores, colaboradores e
              jornadas vinculados.
            </p>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => setExcluirEmpresaOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Excluir empresa
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <EmpresaFormDialog
        open={editEmpresa}
        onOpenChange={setEditEmpresa}
        empresa={empresa}
      />
      <AdminConfirmDialog
        open={excluirEmpresaOpen}
        onOpenChange={setExcluirEmpresaOpen}
        title="Excluir empresa?"
        description="Esta ação é permanente e remove todos os dados vinculados."
        destructive
        confirmLabel="Excluir"
        loading={excluirEmpresaMut.isPending}
        onConfirm={async (motivo) => {
          await excluirEmpresaMut.mutateAsync({ id: empresa.id, motivo });
          setExcluirEmpresaOpen(false);
          navigate({ to: "/admin/empresas" });
        }}
      />
    </div>
  );
}

/* ================================================================== */
/* Aba Colaboradores                                                  */
/* ================================================================== */
function ColaboradoresTab({
  empresaId,
  empresaNome,
  setores,
  jornadas,
  colaboradores,
  loading,
}: {
  empresaId: string;
  empresaNome: string;
  setores: Setor[];
  jornadas: JornadaEmpresa[];
  colaboradores: Colaborador[];
  loading: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [conviteOpen, setConviteOpen] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [excluir, setExcluir] = useState<Colaborador | null>(null);
  const [toggle, setToggle] = useState<Colaborador | null>(null);

  const reenviarMut = useReenviarConvite();
  const enviarEmailConvite = useEnviarEmailConvite();
  const excluirMut = useExcluirColaborador();
  const toggleMut = useToggleColaborador();

  const setorNome = useMemo(
    () => new Map(setores.map((s) => [s.id, s.nome])),
    [setores],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (setorFiltro !== "todos" && c.setor_id !== setorFiltro) return false;
      if (statusFiltro !== "todos" && colaboradorStatus(c) !== statusFiltro)
        return false;
      if (q && !c.nome_completo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [colaboradores, busca, setorFiltro, statusFiltro]);

  /** Reenvia o convite (novo token) e dispara o e-mail; fallback: copiar link. */
  async function reenviar(c: Colaborador) {
    const r = await reenviarMut.mutateAsync({ id: c.id });
    const link = `${window.location.origin}/convite/${r.token}`;
    if (c.email) {
      const ok = await enviarEmailConvite({
        email: c.email,
        nome: c.nome_completo,
        empresaNome,
        link,
      });
      if (ok) {
        toast.success(`✓ Convite reenviado para ${c.email}`);
        return;
      }
    }
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.error("Email não enviado. Link copiado para área de transferência.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar colaborador…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={setorFiltro} onValueChange={setSetorFiltro}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="pendente">Convite pendente</SelectItem>
            <SelectItem value="expirado">Expirado</SelectItem>
            <SelectItem value="demitido">Demitidos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setConviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Convidar
        </Button>
        <Button
          onClick={() => {
            setEditando(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="rounded-2xl bg-card p-3 shadow-card">
        {loading ? (
          <ListRowsSkeleton rows={5} />
        ) : filtrados.length === 0 ? (
          <EmptyState
            title="Nenhum colaborador"
            description="Adicione colaboradores para vincular setores e jornadas."
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtrados.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <InitialsAvatar name={c.nome_completo} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary">
                    {c.nome_completo}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.cargo || "—"} ·{" "}
                    {c.setor_id ? setorNome.get(c.setor_id) : "Sem setor"}
                  </p>
                </div>
                <StatusBadge status={colaboradorStatus(c)} />
                <div className="flex shrink-0 items-center gap-1">
                  {(statusConvite(c) === "pendente" ||
                    statusConvite(c) === "expirado") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Reenviar convite"
                      disabled={reenviarMut.isPending}
                      onClick={() => reenviar(c)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar"
                    onClick={() => {
                      setEditando(c);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={c.ativo ? "Desativar" : "Reativar"}
                    onClick={() => setToggle(c)}
                  >
                    {c.ativo ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir"
                    onClick={() => setExcluir(c)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ColaboradorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresaId={empresaId}
        setores={setores}
        jornadas={jornadas}
        colaborador={editando}
      />
      <ConviteColaboradorDialog
        open={conviteOpen}
        onOpenChange={setConviteOpen}
        empresaId={empresaId}
        empresaNome={empresaNome}
        setores={setores}
        jornadas={jornadas}
      />
      <AdminConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        title="Excluir colaborador?"
        destructive
        confirmLabel="Excluir"
        loading={excluirMut.isPending}
        onConfirm={async (motivo) => {
          if (excluir) await excluirMut.mutateAsync({ id: excluir.id, motivo });
          setExcluir(null);
        }}
      />
      <AdminConfirmDialog
        open={!!toggle}
        onOpenChange={(v) => !v && setToggle(null)}
        title={toggle?.ativo ? "Desativar colaborador?" : "Reativar colaborador?"}
        confirmLabel={toggle?.ativo ? "Desativar" : "Reativar"}
        loading={toggleMut.isPending}
        onConfirm={async (motivo) => {
          if (toggle)
            await toggleMut.mutateAsync({
              id: toggle.id,
              ativo: !toggle.ativo,
              motivo,
            });
          setToggle(null);
        }}
      />
    </div>
  );
}

/* ================================================================== */
/* Aba Setores                                                        */
/* ================================================================== */
function SetoresTab({
  empresaId,
  setores,
  colaboradores,
  loading,
}: {
  empresaId: string;
  setores: Setor[];
  colaboradores: Colaborador[];
  loading: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Setor | null>(null);
  const [excluir, setExcluir] = useState<Setor | null>(null);
  const excluirMut = useExcluirSetor();

  const countPorSetor = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of colaboradores) {
      if (c.setor_id) m.set(c.setor_id, (m.get(c.setor_id) ?? 0) + 1);
    }
    return m;
  }, [colaboradores]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditando(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Novo setor
        </Button>
      </div>

      <div className="rounded-2xl bg-card p-3 shadow-card">
        {loading ? (
          <ListRowsSkeleton rows={4} />
        ) : setores.length === 0 ? (
          <EmptyState
            title="Nenhum setor"
            description="Crie setores para organizar os colaboradores."
          />
        ) : (
          <ul className="divide-y divide-border">
            {setores.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-ponto-entrada">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary">
                    {s.nome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {countPorSetor.get(s.id) ?? 0} colaborador(es)
                    {s.descricao ? ` · ${s.descricao}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar"
                  onClick={() => {
                    setEditando(s);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir"
                  onClick={() => setExcluir(s)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SetorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresaId={empresaId}
        setor={editando}
      />
      <AdminConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        title="Excluir setor?"
        description="Os colaboradores deste setor ficarão sem setor."
        destructive
        confirmLabel="Excluir"
        loading={excluirMut.isPending}
        onConfirm={async (motivo) => {
          if (excluir) await excluirMut.mutateAsync({ id: excluir.id, motivo });
          setExcluir(null);
        }}
      />
    </div>
  );
}

/* ================================================================== */
/* Aba Jornadas                                                       */
/* ================================================================== */
function JornadasTab({
  empresaId,
  jornadas,
  loading,
}: {
  empresaId: string;
  jornadas: JornadaEmpresa[];
  loading: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<JornadaEmpresa | null>(null);
  const [excluir, setExcluir] = useState<JornadaEmpresa | null>(null);
  const excluirMut = useExcluirJornada();
  const duplicarMut = useDuplicarJornada();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditando(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nova jornada
        </Button>
      </div>

      {loading ? (
        <ListRowsSkeleton rows={3} />
      ) : jornadas.length === 0 ? (
        <div className="rounded-2xl bg-card p-3 shadow-card">
          <EmptyState
            title="Nenhuma jornada"
            description="Cadastre jornadas (fixa, flexível, escala ou home office)."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {jornadas.map((j) => (
            <div key={j.id} className="rounded-2xl bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">
                    {j.nome}
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold",
                      TIPO_JORNADA_CLASSE[
                        j.tipo as keyof typeof TIPO_JORNADA_CLASSE
                      ],
                    )}
                  >
                    {tipoJornadaLabel(j.tipo)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar"
                    onClick={() => {
                      setEditando(j);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Duplicar"
                    onClick={() => duplicarMut.mutate({ id: j.id })}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir"
                    onClick={() => setExcluir(j)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {(j.tipo === "fixo" || j.tipo === "homeoffice") && (
                  <span>{diasConfigurados(j)} dia(s) configurado(s)</span>
                )}
                {j.tipo === "flexivel" && (
                  <span>{j.carga_semanal_horas}h/semana</span>
                )}
                {j.tipo === "escala" && j.escala_descricao && (
                  <span>Escala {j.escala_descricao}</span>
                )}
                <span>Tolerância {j.tolerancia_minutos}min</span>
                <span>HE {j.he_percentual_dia_util}%</span>
                {j.banco_horas_ativo && <span>Banco de horas</span>}
                {j.adicional_noturno && <span>Ad. noturno</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <JornadaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresaId={empresaId}
        jornada={editando}
      />
      <AdminConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        title="Excluir jornada?"
        destructive
        confirmLabel="Excluir"
        loading={excluirMut.isPending}
        onConfirm={async (motivo) => {
          if (excluir) await excluirMut.mutateAsync({ id: excluir.id, motivo });
          setExcluir(null);
        }}
      />
    </div>
  );
}
