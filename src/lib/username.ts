// Utilidades de nome de usuário (username) do SINCRO.
// Regras: apenas letras, números, ponto e underline; sempre em MAIÚSCULAS; 3–30 chars.

export const USERNAME_REGEX = /^[A-Z0-9._]{3,30}$/;

/** Remove caracteres inválidos, força maiúsculas e limita a 30 chars. */
export function sanitizeUsername(v: string): string {
  return (v ?? "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .toUpperCase()
    .slice(0, 30);
}

/** Deriva um username a partir do e-mail (tudo antes do @). */
export function usernameFromEmail(email: string): string {
  const prefix = (email ?? "").split("@")[0] ?? "";
  return sanitizeUsername(prefix);
}

export function isUsernameValido(v: string): boolean {
  return USERNAME_REGEX.test(v);
}
