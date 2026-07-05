import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

/**
 * Banner informativo global. Reaparece quando a mensagem muda,
 * pois a chave de dispensa inclui o conteúdo da mensagem.
 */
export function SystemBanner({ mensagem }: { mensagem: string }) {
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    if (!mensagem) {
      setDispensado(true);
      return;
    }
    let salvo = "";
    try {
      salvo = localStorage.getItem("sincro_banner_dismiss") ?? "";
    } catch {
      salvo = "";
    }
    setDispensado(salvo === mensagem);
  }, [mensagem]);

  if (!mensagem || dispensado) return null;

  function dispensar() {
    try {
      localStorage.setItem("sincro_banner_dismiss", mensagem);
    } catch {
      // ignora
    }
    setDispensado(true);
  }

  return (
    <div className="flex items-start gap-2.5 bg-ponto-saida-intervalo/15 px-4 py-2.5 text-ponto-saida-intervalo">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-[13px] font-medium leading-snug">{mensagem}</p>
      <button
        aria-label="Dispensar aviso"
        onClick={dispensar}
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-black/5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
