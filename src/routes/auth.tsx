import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SincroMark } from "@/components/sincro-logo";
import { mensagemErro } from "@/lib/erros";

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
  const [codigoIndicacao, setCodigoIndicacao] = useState("");
  const [indicacaoTravada, setIndicacaoTravada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checando, setChecando] = useState(true);

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


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: nome },
          },
        });
        if (error) throw error;

        const codigo = codigoIndicacao.trim();
        if (codigo) {
          // Aplica a indicação silenciosamente; código inválido nunca bloqueia.
          await supabase.rpc("aplicar_indicacao", { _codigo: codigo });
        }
        try {
          sessionStorage.removeItem("ref_code");
        } catch {
          // ignora
        }

        toast.success("Conta criada! Bem-vindo ao SINCRO.");
        navigate({ to: "/ponto", replace: true });
        return;
      }


      const { data: loginData, error } =
        await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
      if (error) throw error;

      // Bloqueio de conta: impede o acesso.
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

  if (checando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
