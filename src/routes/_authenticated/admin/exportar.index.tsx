import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminProfiles } from "@/hooks/use-admin";
import { useExportarPontos } from "@/hooks/use-exportar-pontos";
import {
  montarRelatorioPontos,
  linhaParaColunas,
  COLUNAS_PONTO,
} from "@/lib/ponto-export";
import { formatDuracao, formatSaldo, type PontoRegistro } from "@/lib/ponto";
import { montarCsv, baixarCsv } from "@/lib/relatorios";
import { baixarPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/admin/exportar/")({
  head: () => ({ meta: [{ title: "Exportar pontos — SINCRO Admin" }] }),
  component: ExportarPage,
});

function primeiroDiaMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ExportarPage() {
  const { data: perfis } = useAdminProfiles();
  const exportar = useExportarPontos();
  const [userId, setUserId] = useState("");
  const [inicio, setInicio] = useState(primeiroDiaMes());
  const [fim, setFim] = useState(hoje());
  const [carregando, setCarregando] = useState<"csv" | "pdf" | null>(null);

  const opcoes = useMemo(
    () =>
      (perfis ?? [])
        .slice()
        .sort((a, b) =>
          (a.nome_completo ?? a.email).localeCompare(b.nome_completo ?? b.email),
        ),
    [perfis],
  );

  async function gerar(formato: "csv" | "pdf") {
    if (!userId) {
      toast.error("Selecione um usuário.");
      return;
    }
    setCarregando(formato);
    try {
      const res = await exportar({ userId, inicio, fim });
      const rel = montarRelatorioPontos(
        res.registros as PontoRegistro[],
        res.profile.carga_horaria_diaria,
        res.profile.timezone,
      );
      const nomeBase = res.profile.nome
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .toLowerCase();
      const periodo = `${inicio}_a_${fim}`;
      const totalTrab = formatDuracao(rel.totalTrabalhadoMin);
      const totalSaldo = formatSaldo(rel.totalSaldoMin);

      if (rel.linhas.length === 0) {
        toast.error("Nenhum registro no período selecionado.");
        setCarregando(null);
        return;
      }

      const linhas = rel.linhas.map(linhaParaColunas);

      if (formato === "csv") {
        const cols = [...COLUNAS_PONTO];
        const corpo = [
          ...linhas,
          [],
          ["Dias com registro", rel.diasComRegistro],
          ["Total trabalhado", totalTrab],
          ["Saldo do período", totalSaldo],
        ];
        baixarCsv(
          `pontos-${nomeBase}-${periodo}.csv`,
          montarCsv(cols, corpo as (string | number)[][]),
        );
      } else {
        baixarPdf(`pontos-${nomeBase}-${periodo}.pdf`, {
          titulo: "Espelho de ponto — SINCRO",
          subtitulo: res.profile.nome,
          linhasInfo: [
            `E-mail: ${res.profile.email}`,
            `Período: ${inicio} a ${fim}`,
            `Fuso horário: ${res.profile.timezone}`,
            `Dias com registro: ${rel.diasComRegistro}  |  Total trabalhado: ${totalTrab}  |  Saldo: ${totalSaldo}`,
          ],
          secoes: [{ colunas: [...COLUNAS_PONTO], linhas }],
          rodape: "* dia com registro editado manualmente — SINCRO",
        });
      }
      toast.success("Exportação gerada.");
    } catch (e) {
      toast.error((e as Error)?.message || "Erro ao exportar.");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-ponto-entrada" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Exportar pontos</h1>
          <p className="text-sm text-muted-foreground">
            Espelho de ponto por período com entrada, pausa, saída e resumo do
            cálculo.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Usuário / colaborador
          </label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome_completo ?? p.email} — {p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Início
            </label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Fim
            </label>
            <Input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => gerar("csv")} disabled={carregando !== null}>
            {carregando === "csv" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => gerar("pdf")}
            disabled={carregando !== null}
          >
            {carregando === "pdf" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
