import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Check,
  ShieldAlert,
  Lock,
  CheckCircle2,
  LogIn,
  MailPlus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SincroMark } from "@/components/sincro-logo";
import { UsernameField } from "@/components/username-field";
import { useUsernameCheck } from "@/hooks/use-cadastro-checks";
import {
  getConvite,
  marcarConviteAceito,
  solicitarNovoConvite,
} from "@/lib/convite.functions";
import { usernameFromEmail } from "@/lib/username";
import { mensagemErro } from "@/lib/erros";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [{ title: "Convite — SINCRO" }],
  }),
  component: ConvitePage,
});

function CentroCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

const STEPS = ["Seus dados", "Criar senha", "Confirmar email"];

function Stepper({ active }: { active: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < active
                  ? "bg-ponto-entrada text-white"
                  : i === active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i < active ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium",
                i <= active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mb-4 h-0.5 w-6 rounded-full",
                i < active ? "bg-ponto-entrada" : "bg-muted",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const buscar = useServerFn(getConvite);
  const aceitar = useServerFn(marcarConviteAceito);
  const solicitar = useServerFn(solicitarNovoConvite);

  const { data: convite, isLoading } = useQuery({
    queryKey: ["convite", token],
    queryFn: () => buscar({ data: { token } }),
    retry: false,
  });

  const [username, setUsername] = useState("");
  const [usernameEditado, setUsernameEditado] = useState(false);
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [concluido, setConcluido] = useState<string | null>(null);

  // "Solicitar novo convite" (token expirado)
  const [emailSolicita, setEmailSolicita] = useState("");
  const [solicitando, setSolicitando] = useState(false);
  const [solicitado, setSolicitado] = useState(false);

  const [countdown, setCountdown] = useState(5);

  const dados = convite?.status === "valido" ? convite.colaborador : null;
  const cpfTravado = !!dados?.cpf;
  const usernameStatus = useUsernameCheck(username, !!dados);

  useEffect(() => {
    if (dados && !usernameEditado) {
      setUsername(usernameFromEmail(dados.email));
    }
    if (dados?.cpf) setCpf(dados.cpf);
  }, [dados, usernameEditado]);

  // Countdown + redirect após conta criada.
  useEffect(() => {
    if (!concluido) return;
    if (countdown <= 0) {
      navigate({ to: "/ponto" });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [concluido, countdown, navigate]);

  if (isLoading) {
    return (
      <CentroCard>
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </CentroCard>
    );
  }

  // ---- Sucesso: conta criada ----
  if (concluido) {
    return (
      <CentroCard>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex h-20 w-20 animate-in zoom-in-50 items-center justify-center rounded-full bg-ponto-entrada/15 duration-500">
            <CheckCircle2 className="h-11 w-11 text-ponto-entrada" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-primary">
            Conta criada!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique seu e-mail{" "}
            <span className="font-semibold text-foreground">{concluido}</span>{" "}
            para confirmar sua conta.
          </p>
          <p className="mt-5 text-xs text-muted-foreground">
            Redirecionando em {countdown}s…
          </p>
          <Button
            variant="outline"
            className="mt-3 h-11 w-full rounded-xl"
            onClick={() => navigate({ to: "/ponto" })}
          >
            Continuar agora
          </Button>
        </div>
      </CentroCard>
    );
  }

  // ---- Convite já aceito ----
  if (convite?.status === "aceito") {
    return (
      <CentroCard>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ponto-entrada/15">
            <Check className="h-8 w-8 text-ponto-entrada" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-primary">
            Esta conta já foi criada
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu convite já foi utilizado. Faça login para acessar o SINCRO.
          </p>
          <Button
            className="mt-6 h-12 w-full rounded-xl"
            onClick={() => navigate({ to: "/auth" })}
          >
            <LogIn className="h-4 w-4" /> Fazer login
          </Button>
        </div>
      </CentroCard>
    );
  }

  // ---- Convite expirado: solicitar novo ----
  if (convite?.status === "expirado") {
    return (
      <CentroCard>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-primary">
            Convite expirado
          </h1>
          {solicitado ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Pedido enviado! O RH da sua empresa foi avisado e enviará um novo
              convite em breve.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Este link não é mais válido. Solicite um novo convite ao RH da
                sua empresa.
              </p>
              <form
                className="mt-5 space-y-3 text-left"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!/.+@.+\..+/.test(emailSolicita.trim())) {
                    toast.error("Informe um e-mail válido.");
                    return;
                  }
                  setSolicitando(true);
                  try {
                    const r = await solicitar({
                      data: { token, email: emailSolicita.trim() },
                    });
                    if (r.ok) {
                      setSolicitado(true);
                    } else {
                      toast.error(
                        "Não foi possível notificar o RH. Contate sua empresa diretamente.",
                      );
                    }
                  } catch {
                    toast.error("Erro ao solicitar novo convite.");
                  } finally {
                    setSolicitando(false);
                  }
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email-solicita">Seu e-mail</Label>
                  <Input
                    id="email-solicita"
                    type="email"
                    value={emailSolicita}
                    onChange={(e) => setEmailSolicita(e.target.value)}
                    placeholder="voce@empresa.com"
                    className="h-12"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={solicitando}
                  className="h-12 w-full rounded-xl"
                >
                  {solicitando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="h-4 w-4" />
                  )}
                  Solicitar novo convite
                </Button>
              </form>
            </>
          )}
          <Button
            variant="ghost"
            className="mt-4 h-11 w-full rounded-xl"
            onClick={() => navigate({ to: "/auth" })}
          >
            Ir para o login
          </Button>
        </div>
      </CentroCard>
    );
  }

  // ---- Convite inválido ----
  if (!convite || convite.status !== "valido" || !dados) {
    return (
      <CentroCard>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-primary">
            Convite inválido
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de convite não existe. Confirme com o RH da sua empresa.
          </p>
          <Button
            variant="outline"
            className="mt-6 h-12 w-full rounded-xl"
            onClick={() => navigate({ to: "/auth" })}
          >
            Ir para o login
          </Button>
        </div>
      </CentroCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dados) return;
    if (senha.length < 8 || !/\d/.test(senha)) {
      toast.error("A senha precisa ter ao menos 8 caracteres e 1 número.");
      return;
    }
    if (senha !== confirmar) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (usernameStatus !== "available") {
      toast.error("Escolha um usuário válido e disponível.");
      return;
    }
    if (!aceitouTermos) {
      toast.error("É necessário aceitar os Termos de Uso.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: dados.email,
        password: senha,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: dados.nome,
            username,
            tipo_conta: "colaborador",
            empresa_id: dados.empresaId,
          },
        },
      });
      if (error) throw error;

      await aceitar({
        data: { token, cpf: cpfTravado ? null : cpf.trim() || null },
      });

      setConcluido(dados.email);
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <CentroCard>
      <div className="mb-6 flex flex-col items-center text-center">
        <SincroMark size={56} className="shadow-soft" />
        <h1 className="mt-4 text-xl font-bold text-primary">
          Olá, {username || dados.nome}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua conta está quase pronta. Complete o cadastro para começar.
        </p>
      </div>

      <Stepper active={1} />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card"
      >
        <LockedField label="Nome completo" value={dados.nome} />
        <LockedField label="E-mail" value={dados.email} />
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
            <Check className="h-4 w-4 text-ponto-entrada" />
            <span className="font-medium text-foreground">
              {dados.empresaNome}
            </span>
          </div>
        </div>

        <UsernameField
          value={username}
          onChange={(v) => {
            setUsernameEditado(true);
            setUsername(v);
          }}
          status={usernameStatus}
        />

        {cpfTravado ? (
          <LockedField label="CPF" value={dados.cpf ?? ""} />
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="cpf">CPF (opcional)</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="h-13"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-13"
          />
          <p className="text-xs text-muted-foreground">
            Pelo menos 8 caracteres e 1 número.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmar">Confirmar senha</Label>
          <Input
            id="confirmar"
            type="password"
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-13"
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            checked={aceitouTermos}
            onCheckedChange={(v) => setAceitouTermos(v === true)}
            className="mt-0.5"
          />
          <span>Li e aceito os Termos de Uso</span>
        </label>

        <Button
          type="submit"
          disabled={loading}
          className="h-13 w-full rounded-xl bg-primary text-base font-semibold hover:bg-[#1E3A5F]"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar minha conta
        </Button>
      </form>
    </CentroCard>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}
