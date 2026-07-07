import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  QrCode,
  CreditCard,
  Barcode,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/erros";
import {
  PLANOS,
  fmtMoedaBR,
  cpfCnpjValido,
  FORMA_PAGAMENTO_LABEL,
  type FormaPagamento,
  type PlanoPago,
} from "@/lib/asaas";
import {
  criarCheckout,
  verificarPagamento,
  type CheckoutResult,
} from "@/lib/assinaturas.functions";

type Passo = "dados" | "pix" | "boleto" | "processando";

const FORMAS: { id: FormaPagamento; icon: typeof QrCode }[] = [
  { id: "PIX", icon: QrCode },
  { id: "CREDIT_CARD", icon: CreditCard },
  { id: "BOLETO", icon: Barcode },
];

export function CheckoutModal({
  open,
  onOpenChange,
  plano,
  nomePadrao,
  emailPadrao,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plano: PlanoPago;
  nomePadrao: string;
  emailPadrao: string;
}) {
  const info = PLANOS[plano];
  const checkoutFn = useServerFn(criarCheckout);
  const verificarFn = useServerFn(verificarPagamento);
  const queryClient = useQueryClient();

  const [passo, setPasso] = useState<Passo>("dados");
  const [nome, setNome] = useState(nomePadrao);
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState(emailPadrao);
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [cartao, setCartao] = useState({
    number: "",
    holderName: "",
    expiry: "",
    ccv: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [segundos, setSegundos] = useState(30 * 60);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setPasso("dados");
      setNome(nomePadrao);
      setEmail(emailPadrao);
      setResult(null);
    }
  }, [open, nomePadrao, emailPadrao]);

  // Limpa timers ao fechar
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function sucesso() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    void queryClient.invalidateQueries();
    toast.success("Pagamento confirmado! Bem-vindo ao SINCRO Premium.");
    onOpenChange(false);
  }

  function iniciarPolling(paymentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setSegundos(30 * 60);
    tickRef.current = setInterval(() => {
      setSegundos((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    pollRef.current = setInterval(async () => {
      try {
        const r = await verificarFn({ data: { paymentId } });
        if (r.pago) sucesso();
      } catch {
        // ignora falhas transitórias de polling
      }
    }, 5000);
  }

  async function handleSubmit() {
    if (!nome.trim()) return toast.error("Informe seu nome.");
    if (!cpfCnpjValido(cpf)) return toast.error("CPF ou CNPJ inválido.");
    if (!email.trim()) return toast.error("Informe seu email.");
    if (forma === "CREDIT_CARD") {
      if (
        !cartao.number ||
        !cartao.holderName ||
        !cartao.expiry.includes("/") ||
        !cartao.ccv
      ) {
        return toast.error("Preencha os dados do cartão.");
      }
    }

    setLoading(true);
    try {
      const [mm, yy] = cartao.expiry.split("/");
      const r = await checkoutFn({
        data: {
          plano,
          forma,
          nome: nome.trim(),
          cpfCnpj: cpf,
          email: email.trim(),
          ...(forma === "CREDIT_CARD"
            ? {
                cartao: {
                  holderName: cartao.holderName.trim(),
                  number: cartao.number.replace(/\s/g, ""),
                  expiryMonth: (mm ?? "").trim(),
                  expiryYear:
                    (yy ?? "").trim().length === 2
                      ? `20${(yy ?? "").trim()}`
                      : (yy ?? "").trim(),
                  ccv: cartao.ccv.trim(),
                },
              }
            : {}),
        },
      });
      setResult(r);

      if (r.aprovado) {
        sucesso();
      } else if (r.forma === "PIX") {
        setPasso("pix");
        iniciarPolling(r.paymentId);
      } else if (r.forma === "BOLETO") {
        setPasso("boleto");
        iniciarPolling(r.paymentId);
      } else {
        toast.error("Pagamento não aprovado. Verifique os dados do cartão.");
      }
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setLoading(false);
    }
  }

  function copiar(txt: string) {
    void navigator.clipboard.writeText(txt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    toast.success("Código copiado!");
  }

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0">
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Assinar {info.nome}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {fmtMoedaBR(info.valor)}
              {plano === "premium_mensal" ? "/mês" : "/ano"}
            </DialogDescription>
          </DialogHeader>

          {passo === "dados" && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ck-nome">Nome completo</Label>
                <Input
                  id="ck-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ck-cpf">CPF ou CNPJ</Label>
                <Input
                  id="ck-cpf"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Somente números"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ck-email">Email</Label>
                <Input
                  id="ck-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAS.map((f) => {
                    const Icone = f.icon;
                    const ativo = forma === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setForma(f.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-colors",
                          ativo
                            ? "border-ponto-entrada bg-ponto-entrada/10 text-ponto-entrada"
                            : "border-border text-muted-foreground hover:bg-secondary/50",
                        )}
                      >
                        <Icone className="h-5 w-5" />
                        {FORMA_PAGAMENTO_LABEL[f.id]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {forma === "CREDIT_CARD" && (
                <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
                  <Input
                    placeholder="Número do cartão"
                    inputMode="numeric"
                    value={cartao.number}
                    onChange={(e) =>
                      setCartao((c) => ({ ...c, number: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Nome impresso no cartão"
                    value={cartao.holderName}
                    onChange={(e) =>
                      setCartao((c) => ({ ...c, holderName: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="MM/AA"
                      value={cartao.expiry}
                      onChange={(e) =>
                        setCartao((c) => ({ ...c, expiry: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="CVV"
                      inputMode="numeric"
                      value={cartao.ccv}
                      onChange={(e) =>
                        setCartao((c) => ({ ...c, ccv: e.target.value }))
                      }
                    />
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Dados processados com segurança pelo Asaas. Não armazenamos
                    seu cartão.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="h-12 w-full rounded-xl bg-ponto-entrada text-base font-semibold text-ponto-entrada-foreground hover:bg-ponto-entrada/90"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Pagar ${fmtMoedaBR(info.valor)}`
                )}
              </Button>
            </div>
          )}

          {passo === "pix" && result?.pix && (
            <div className="mt-4 flex flex-col items-center gap-3 text-center">
              <img
                src={`data:image/png;base64,${result.pix.encodedImage}`}
                alt="QR Code PIX"
                className="h-52 w-52 rounded-xl border border-border"
              />
              <p className="text-sm font-semibold text-foreground">
                Expira em {mm}:{ss}
              </p>
              <div className="w-full rounded-xl border border-border bg-secondary/40 p-3">
                <p className="break-all text-[11px] text-muted-foreground">
                  {result.pix.payload}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => copiar(result.pix!.payload)}
                className="h-11 w-full rounded-xl"
              >
                {copiado ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copiar código PIX
              </Button>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aguardando confirmação do pagamento…
              </p>
            </div>
          )}

          {passo === "boleto" && result?.boleto && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <p className="break-all text-xs text-foreground">
                  {result.boleto.linhaDigitavel || "Boleto gerado"}
                </p>
              </div>
              {result.boleto.linhaDigitavel && (
                <Button
                  variant="outline"
                  onClick={() => copiar(result.boleto!.linhaDigitavel)}
                  className="h-11 w-full rounded-xl"
                >
                  {copiado ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copiar código de barras
                </Button>
              )}
              {result.boleto.url && (
                <Button
                  asChild
                  className="h-11 w-full rounded-xl bg-primary text-primary-foreground"
                >
                  <a
                    href={result.boleto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir boleto PDF
                  </a>
                </Button>
              )}
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                Seu acesso premium será liberado após a compensação (até 3 dias
                úteis).
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
