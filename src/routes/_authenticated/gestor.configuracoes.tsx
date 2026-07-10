import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Search, Loader2, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { LeafletMap } from "@/components/leaflet-map";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  useEmpresaLocalizacao,
  useSalvarLocalizacao,
} from "@/hooks/use-empresa-localizacao";
import {
  geocodificarEndereco,
  obterPosicaoAtual,
} from "@/lib/geolocalizacao";
import { mensagemErro } from "@/lib/erros";

export const Route = createFileRoute("/_authenticated/gestor/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Gestor SINCRO" }] }),
  component: GestorConfiguracoes,
});

function GestorConfiguracoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);
  const empresaId = profile?.empresa_id ?? undefined;
  const { data: loc, isLoading } = useEmpresaLocalizacao(empresaId);
  const salvar = useSalvarLocalizacao();

  const [endereco, setEndereco] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [raio, setRaio] = useState(150);
  const [exigir, setExigir] = useState(false);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (loc) {
      setEndereco(loc.endereco ?? "");
      setLat(loc.latitude ? Number(loc.latitude) : null);
      setLng(loc.longitude ? Number(loc.longitude) : null);
      setRaio(loc.raio_metros ?? 150);
      setExigir(loc.exigir_localizacao ?? false);
    }
  }, [loc]);

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (profile && profile.tipo_conta !== "gestor") {
    navigate({ to: "/ponto", replace: true });
    return null;
  }

  async function buscarEndereco() {
    if (!endereco.trim()) {
      toast.error("Digite um endereço.");
      return;
    }
    setBuscando(true);
    try {
      const res = await geocodificarEndereco(endereco);
      if (!res) {
        toast.error("Endereço não encontrado.");
        return;
      }
      setLat(res.latitude);
      setLng(res.longitude);
      setEndereco(res.endereco_formatado);
      toast.success("Localização encontrada.");
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setBuscando(false);
    }
  }

  async function usarMinhaLocalizacao() {
    setBuscando(true);
    try {
      const pos = await obterPosicaoAtual();
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      toast.success("Localização atual capturada.");
    } catch {
      toast.error("Não foi possível obter a localização.");
    } finally {
      setBuscando(false);
    }
  }

  async function handleSalvar() {
    if (lat === null || lng === null) {
      toast.error("Defina a localização da empresa primeiro.");
      return;
    }
    try {
      await salvar.mutateAsync({
        endereco,
        latitude: lat,
        longitude: lng,
        raio_metros: raio,
        exigir_localizacao: exigir,
      });
      toast.success("Configuração de localização salva.");
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 bg-primary px-4 text-primary-foreground md:px-8">
        <Link
          to="/gestor"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-lg font-bold tracking-tight">Configurações</span>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-16 md:px-8">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">
              Localização e cerca virtual
            </h2>
          </div>

          {isLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Endereço da empresa</Label>
                <div className="flex gap-2">
                  <Input
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, cidade..."
                    onKeyDown={(e) => e.key === "Enter" && buscarEndereco()}
                  />
                  <Button
                    variant="secondary"
                    onClick={buscarEndereco}
                    disabled={buscando}
                  >
                    {buscando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <button
                  onClick={usarMinhaLocalizacao}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Crosshair className="h-3.5 w-3.5" /> Usar minha localização
                  atual
                </button>
              </div>

              {lat !== null && lng !== null && (
                <LeafletMap
                  latitude={lat}
                  longitude={lng}
                  raioMetros={raio}
                  className="h-64 w-full"
                />
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Raio permitido</Label>
                  <span className="text-xs font-semibold text-primary">
                    {raio} m
                  </span>
                </div>
                <Slider
                  min={50}
                  max={1000}
                  step={10}
                  value={[raio]}
                  onValueChange={(v) => setRaio(v[0])}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                <div>
                  <Label className="text-sm">Exigir localização no ponto</Label>
                  <p className="text-xs text-muted-foreground">
                    Bloqueia batidas fora da área definida.
                  </p>
                </div>
                <Switch checked={exigir} onCheckedChange={setExigir} />
              </div>

              <Button onClick={handleSalvar} disabled={salvar.isPending}>
                {salvar.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar localização
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
