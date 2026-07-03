import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePremiumStatus } from "@/hooks/use-premium";
import { copiarLinkReferral, verificarRecompensasPremium } from "@/lib/premium";
import { UpsellModal } from "@/components/upsell-modal";

interface PremiumContextValue {
  isPremium: boolean;
  premiumUntil: Date | null;
  isLoading: boolean;
  referralCode: string | null;
  /** Abre o modal de upsell, opcionalmente citando o recurso desejado. */
  openUpsell: (feature?: string) => void;
  /** Copia o link de indicação para a área de transferência. */
  compartilhar: () => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({
  userId,
  referralCode,
  children,
}: {
  userId: string | undefined;
  referralCode: string | null;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const { isPremium, premiumUntil, isLoading } = usePremiumStatus(userId);

  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | null>(null);

  // Recompensas de sessão (indicações aceitas, indicado que também compartilhou,
  // e revalidação de streak/perfil ao abrir o app).
  useEffect(() => {
    if (userId) {
      void verificarRecompensasPremium(userId, queryClient);
    }
  }, [userId, queryClient]);

  const openUpsell = useCallback((f?: string) => {
    setFeature(f ?? null);
    setOpen(true);
  }, []);

  const compartilhar = useCallback(() => {
    void copiarLinkReferral(referralCode);
  }, [referralCode]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        premiumUntil,
        isLoading,
        referralCode,
        openUpsell,
        compartilhar,
      }}
    >
      {children}
      <UpsellModal
        open={open}
        onOpenChange={setOpen}
        feature={feature}
        referralCode={referralCode}
      />
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error("usePremium deve ser usado dentro de <PremiumProvider>");
  }
  return ctx;
}
