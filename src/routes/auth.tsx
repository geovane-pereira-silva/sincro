import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Check, X, MailCheck, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SincroMark } from "@/components/sincro-logo";
import { UsernameField } from "@/components/username-field";
import {
  useUsernameCheck,
  useEmpresaCheck,
} from "@/hooks/use-cadastro-checks";
import { usernameFromEmail } from "@/lib/username";
import { mensagemErro } from "@/lib/erros";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — SINCRO" },
      {
        name: "description",
        content: "Acesse sua conta SINCRO e registre sua jornada.",
      },
    ],
  }),
  component: AuthPage,
});

type Modo = "login" | "cadastro" | "recuperar";

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEditado, setUsernameEditado] = useState(false);
  const [tipoConta, setTipoConta] = useState<"autonomo" | "colaborador">(
    "autonomo",
  );
  const [empresaNome, setEmpresaNome] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState("");
  const [indicacaoTravada, setIndicacaoTravada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [checando, setChecando] = useState(true);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState<
    string | null
  >(null);
  const [reenviando, setReenviando] = useState(false);
  const [precisaConfirmar, setPrecisaConfirmar] = useState(false);

  const usernameStatus = useUsernameCheck(username, modo === "cadastro");
  const empresaCheck = useEmpresaCheck(
    empresaNome,
    modo === "cadastro" && tipoConta === "colaborador",
  );

  useEffect(() => {
    let codigoSalvo = "";
    try {
      codigoSalvo = sessionStorage.getItem("ref_code") ?? "";
    } catch {
      codigoSalvo = "";
    }
    if (codigoSalvo) {
      setCodigoIndicacao(codigoSalvo);
      setIndicacaoTravada(true);
      setModo("cadastro");
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/ponto", replace: true });
      } else {
        setChecando(false);
      }
    });
  }, [navigate]);

  // Preenche o username automaticamente a partir do e-mail (se não editado).
  useEffect(() => {
    if (modo !== "cadastro" || usernameEditado) return;
    setUsername(usernameFromEmail(email));
  }, [email, modo, usernameEditado]);

  async function handleResend(targetEmail: string) {
    setReenviando(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Enviamos um novo e-mail de confirmação.");
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setReenviando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPrecisaConfirmar(false);
    setLoading(true);
    try {
      if (modo === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para o seu e-mail.");
        setModo("login");
        return;
      }

      if (modo === "cadastro") {
        if (senha.length < 8 || !/\d/.test(senha)) {
          toast.error(
            "Sua senha precisa ter pelo menos 8 caracteres e 1 número — para proteger seus dados 🔒",
          );
          setLoading(false);
          return;
        }
        if (usernameStatus !== "available") {
          toast.error(
            usernameStatus === "taken"
              ? "Este usuário já está em uso. Escolha outro."
              : "Escolha um usuário válido e disponível.",
          );
          setLoading(false);
          return;
        }
        let empresaId: string | null = null;
        if (tipoConta === "colaborador") {
          if (empresaCheck.status !== "found") {
            toast.error(
              "Confirme o nome da empresa antes de continuar o cadastro.",
            );
            setLoading(false);
            return;
          }
          empresaId = empresaCheck.id;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: nome,
              username,
              tipo_conta: tipoConta,
              empresa_id: empresaId,
            },
          },
        });
        if (error) throw error;

        const codigo = codigoIndicacao.trim();
        if (codigo) {
          await supabase.rpc("aplicar_indicacao", { _codigo: codigo });
        }
        try {
          sessionStorage.removeItem("ref_code");
        } catch {
          // ignora
        }

        setAguardandoConfirmacao(email);
        return;
      }

      const { data: loginData, error } =
        await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
      if (error) {
        if (/confirm/i.test(error.message)) {
          setPrecisaConfirmar(true);
          toast.error("Confirme seu e-mail antes de entrar.");
          return;
        }
        throw error;
      }

      if (loginData.user) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("bloqueado")
          .eq("id", loginData.user.id)
          .maybeSingle();
        if (perfil?.bloqueado) {
          await supabase.auth.signOut();
          toast.error("Conta suspensa. Entre em contato com o suporte.");
          return;
        }
      }

      navigate({ to: "/ponto", replace: true });
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(mensagemErro(result.error));
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/ponto", replace: true });
    } catch (err) {
      toast.error(mensagemErro(err));
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(mensagemErro(result.error));
        setAppleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/ponto", replace: true });
    } catch (err) {
      toast.error(mensagemErro(err));
      setAppleLoading(false);
    }
  }

  if (checando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Tela de confirmação de e-mail (pós-cadastro por e-mail/senha).
  if (aguardandoConfirmacao) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ponto-entrada/15">
            <MailCheck className="h-8 w-8 text-ponto-entrada" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-primary">
            Verifique seu e-mail
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um link de confirmação para{" "}
            <span className="font-semibold text-foreground">
              {aguardandoConfirmacao}
            </span>
            . Clique no link para ativar sua conta.
          </p>
          <Button
            variant="outline"
            className="mt-6 h-12 w-full rounded-xl"
            disabled={reenviando}
            onClick={() => handleResend(aguardandoConfirmacao)}
          >
            {reenviando && <Loader2 className="h-4 w-4 animate-spin" />}
            Reenviar e-mail de confirmação
          </Button>
          <button
            onClick={() => {
              setAguardandoConfirmacao(null);
              setModo("login");
            }}
            className="mt-4 text-sm font-semibold text-primary hover:underline"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <SincroMark size={64} className="shadow-soft" />
          <h1 className="mt-4 text-[28px] font-extrabold tracking-tight text-primary">
            SINCRO
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Seu tempo, seu controle.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            {modo === "login" && "Entre para registrar sua jornada"}
            {modo === "cadastro" && "Crie sua conta gratuita"}
            {modo === "recuperar" && "Recupere o acesso à sua conta"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          {modo === "cadastro" && (
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                className="h-13"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              className="h-13"
            />
          </div>

          {modo === "cadastro" && (
            <>
              {/* Tipo de conta */}
              <div className="space-y-1.5">
                <Label>Você é:</Label>
                <div className="grid gap-2">
                  <TipoContaOption
                    active={tipoConta === "autonomo"}
                    icon={<UserRound className="h-5 w-5" />}
                    titulo="Autônomo / Freelancer"
                    descricao="Uso pessoal, sem vínculo com empresa"
                    onClick={() => setTipoConta("autonomo")}
                  />
                  <TipoContaOption
                    active={tipoConta === "colaborador"}
                    icon={<Building2 className="h-5 w-5" />}
                    titulo="Colaborador de empresa"
                    descricao="Minha empresa usa o SINCRO"
                    onClick={() => setTipoConta("colaborador")}
                  />
                </div>
              </div>

              {tipoConta === "colaborador" && (
                <div className="space-y-1.5">
                  <Label htmlFor="empresa">Nome da empresa</Label>
                  <div className="relative">
                    <Input
                      id="empresa"
                      value={empresaNome}
                      onChange={(e) => setEmpresaNome(e.target.value)}
                      placeholder="Ex: Acme Ltda"
                      autoComplete="off"
                      className="h-13 pr-9"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {empresaCheck.status === "checking" && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {empresaCheck.status === "found" && (
                        <Check className="h-4 w-4 text-ponto-entrada" />
                      )}
                      {empresaCheck.status === "notfound" && (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </span>
                  </div>
                  {empresaCheck.status === "found" && (
                    <p className="text-xs font-medium text-ponto-entrada">
                      Empresa encontrada: {empresaCheck.nome} ✓
                    </p>
                  )}
                  {empresaCheck.status === "notfound" && (
                    <p className="text-xs text-destructive">
                      Empresa não encontrada. Verifique o nome ou entre em
                      contato com seu RH.
                    </p>
                  )}
                </div>
              )}

              <UsernameField
                value={username}
                onChange={(v) => {
                  setUsernameEditado(true);
                  setUsername(v);
                }}
                status={usernameStatus}
              />
            </>
          )}

          {modo !== "recuperar" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                {modo === "login" && (
                  <button
                    type="button"
                    onClick={() => setModo("recuperar")}
                    className="text-xs font-medium text-accent-foreground hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <Input
                id="senha"
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete={
                  modo === "cadastro" ? "new-password" : "current-password"
                }
                className="h-13"
              />
              {modo === "cadastro" && (
                <p className="text-xs text-muted-foreground">
                  Pelo menos 8 caracteres e 1 número.
                </p>
              )}
            </div>
          )}

          {precisaConfirmar && modo === "login" && (
            <div className="rounded-lg bg-ponto-saida-intervalo/10 p-3 text-xs text-foreground">
              Confirme seu e-mail antes de entrar.{" "}
              <button
                type="button"
                disabled={reenviando}
                onClick={() => handleResend(email)}
                className="font-semibold text-primary hover:underline"
              >
                Reenviar e-mail →
              </button>
            </div>
          )}

          {modo === "cadastro" && (
            <div className="space-y-1.5">
              <Label htmlFor="indicacao">Código de indicação (opcional)</Label>
              <Input
                id="indicacao"
                value={codigoIndicacao}
                onChange={(e) =>
                  setCodigoIndicacao(e.target.value.toUpperCase())
                }
                placeholder="Ex: JOAO2847"
                disabled={indicacaoTravada}
                autoComplete="off"
                autoCapitalize="characters"
                className="h-13"
              />
              {indicacaoTravada && (
                <p className="text-xs font-medium text-primary">
                  Indicado por um amigo ✓
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-13 w-full rounded-xl bg-primary text-base font-semibold hover:bg-[#1E3A5F]"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {modo === "login" && "Entrar"}
            {modo === "cadastro" && "Criar conta"}
            {modo === "recuperar" && "Enviar link de recuperação"}
          </Button>

          {modo !== "recuperar" && (
            <>
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="h-13 w-full rounded-xl border-border text-base font-medium"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Entrar com Google
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleApple}
                disabled={appleLoading}
                className="h-13 w-full rounded-xl border-border text-base font-medium"
              >
                {appleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AppleIcon />
                )}
                Entrar com Apple
              </Button>
            </>
          )}
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          {modo === "login" && (
            <>
              Não tem conta?{" "}
              <button
                onClick={() => setModo("cadastro")}
                className="font-semibold text-primary hover:underline"
              >
                Criar conta
              </button>
            </>
          )}
          {modo === "cadastro" && (
            <>
              Já tem conta?{" "}
              <button
                onClick={() => setModo("login")}
                className="font-semibold text-primary hover:underline"
              >
                Entrar
              </button>
            </>
          )}
          {modo === "recuperar" && (
            <button
              onClick={() => setModo("login")}
              className="font-semibold text-primary hover:underline"
            >
              Voltar para o login
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-muted-foreground/70">
          Usado por autônomos, freelancers e MEIs para controlar a própria
          jornada.
        </p>
      </div>
    </div>
  );
}

function TipoContaOption({
  active,
  icon,
  titulo,
  descricao,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">
          {titulo}
        </span>
        <span className="block text-xs text-muted-foreground">{descricao}</span>
      </span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 2.98-.84.94-2.2 1.66-3.32 1.57-.14-1.12.42-2.3 1.1-3.02.78-.84 2.14-1.46 3.34-1.53zM20.9 17.02c-.6 1.4-.9 2.02-1.68 3.26-1.08 1.72-2.6 3.86-4.48 3.88-1.68.02-2.1-1.1-4.38-1.08-2.28.01-2.74 1.1-4.42 1.08-1.88-.02-3.32-1.94-4.4-3.66C-1.6 16.7-2 11.9.2 9.37c1.14-1.32 2.66-2.1 4.28-2.1 1.66 0 2.7 1.1 4.06 1.1 1.32 0 2.12-1.1 4.04-1.1 1.44 0 2.96.78 4.06 2.14-3.56 1.96-2.98 7.04.26 8.51z" />
    </svg>
  );
}
