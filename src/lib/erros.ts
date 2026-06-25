// Converte erros do backend em mensagens amigáveis em português.
export function mensagemErro(error: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const m = msg.toLowerCase();

  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já possui uma conta. Tente entrar.";
  if (m.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (m.includes("for security purposes") || m.includes("rate limit"))
    return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Informe um e-mail válido.";
  if (m.includes("pwned") || m.includes("compromised"))
    return "Esta senha é muito comum e já vazou em outros sites. Escolha outra mais segura.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Falha de conexão. Verifique sua internet e tente novamente.";

  return "Algo deu errado. Tente novamente em instantes.";
}
