import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkUsername, checkEmpresa } from "@/lib/cadastro.functions";
import { isUsernameValido } from "@/lib/username";

export type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

/** Verifica disponibilidade do username com debounce de 500ms. */
export function useUsernameCheck(username: string, enabled = true) {
  const fn = useServerFn(checkUsername);
  const [status, setStatus] = useState<UsernameStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    const u = username.trim();
    if (!u) {
      setStatus("idle");
      return;
    }
    if (!isUsernameValido(u)) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await fn({ data: { username: u } });
        setStatus(r.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [username, enabled, fn]);

  return status;
}

export type EmpresaStatus =
  | { status: "idle" | "checking" | "notfound" }
  | { status: "found"; id: string; nome: string };

/** Valida existência de empresa pelo nome com debounce de 500ms. */
export function useEmpresaCheck(nome: string, enabled = true) {
  const fn = useServerFn(checkEmpresa);
  const [res, setRes] = useState<EmpresaStatus>({ status: "idle" });

  useEffect(() => {
    if (!enabled) {
      setRes({ status: "idle" });
      return;
    }
    const n = nome.trim();
    if (n.length < 3) {
      setRes({ status: "idle" });
      return;
    }
    setRes({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await fn({ data: { nome: n } });
        if (r.found) setRes({ status: "found", id: r.id, nome: r.nome });
        else setRes({ status: "notfound" });
      } catch {
        setRes({ status: "notfound" });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [nome, enabled, fn]);

  return res;
}
