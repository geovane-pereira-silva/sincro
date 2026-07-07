// Cliente HTTP server-only para a API do Asaas.
// NUNCA importar em componentes/rotas diretamente — apenas dentro de
// handlers de server functions ou server routes (import dinâmico).
import type { FormaPagamento, PlanoPago } from "./asaas";

function asaasBaseUrl(): string {
  const env = (
    process.env.ASAAS_ENVIRONMENT ??
    process.env.VITE_ASAAS_ENVIRONMENT ??
    "sandbox"
  ).toLowerCase();
  return env === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

function asaasKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) {
    throw new Error(
      "ASAAS_API_KEY não configurada. Adicione a chave nos segredos do backend.",
    );
  }
  return key;
}

async function asaasFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: asaasKey(),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg =
      body?.errors?.[0]?.description ??
      body?.message ??
      `Erro Asaas (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export interface AsaasCustomer {
  id: string;
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  subscription?: string;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  nextDueDate?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
}

export interface CartaoInput {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface HolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode?: string;
  addressNumber?: string;
  phone?: string;
}

/** Cria (ou reaproveita) o cliente Asaas para o CPF/CNPJ informado. */
export async function criarClienteAsaas(input: {
  name: string;
  email: string;
  cpfCnpj: string;
}): Promise<AsaasCustomer> {
  // Tenta localizar cliente existente por CPF/CNPJ
  const existente = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?cpfCnpj=${encodeURIComponent(input.cpfCnpj)}`,
  );
  if (existente.data?.length) return existente.data[0];

  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

const CICLO_ASAAS: Record<PlanoPago, "MONTHLY" | "YEARLY"> = {
  premium_mensal: "MONTHLY",
  premium_anual: "YEARLY",
};

/** Cria uma assinatura recorrente no Asaas. */
export async function criarAssinaturaAsaas(input: {
  customer: string;
  billingType: FormaPagamento;
  value: number;
  plano: PlanoPago;
  description: string;
  creditCard?: CartaoInput;
  creditCardHolderInfo?: HolderInfo;
  remoteIp?: string;
}): Promise<AsaasSubscription> {
  const hoje = new Date();
  const dueDate = hoje.toISOString().slice(0, 10);
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      nextDueDate: dueDate,
      cycle: CICLO_ASAAS[input.plano],
      description: input.description,
      ...(input.creditCard ? { creditCard: input.creditCard } : {}),
      ...(input.creditCardHolderInfo
        ? { creditCardHolderInfo: input.creditCardHolderInfo }
        : {}),
      ...(input.remoteIp ? { remoteIp: input.remoteIp } : {}),
    }),
  });
}

/** Primeira cobrança gerada por uma assinatura. */
export async function primeiraCobrancaAssinatura(
  subscriptionId: string,
): Promise<AsaasPayment | null> {
  const res = await asaasFetch<{ data: AsaasPayment[] }>(
    `/subscriptions/${subscriptionId}/payments`,
  );
  return res.data?.[0] ?? null;
}

export async function obterCobranca(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function obterPixQrCode(
  paymentId: string,
): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export async function obterLinhaDigitavel(
  paymentId: string,
): Promise<{ identificationField: string; barCode: string }> {
  return asaasFetch(`/payments/${paymentId}/identificationField`);
}

export async function cancelarAssinaturaAsaas(
  subscriptionId: string,
): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
