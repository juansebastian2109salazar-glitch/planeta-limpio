import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Loader2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
  /** Copy shown when the visitor is not signed in yet. */
  message?: string;
}

/**
 * Gates a section behind Internet Identity. While the identity is loading it
 * shows a spinner; when the visitor is anonymous it offers a sign-in action.
 */
export function RequireAuth({ children, message }: RequireAuthProps) {
  const { isAuthenticated, isInitializing, login, isLoggingIn } =
    useInternetIdentity();

  if (isInitializing) {
    return (
      <div
        data-ocid="auth.loading_state"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p className="text-sm">Comprobando tu sesión…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        data-ocid="auth.empty_state"
        className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-5 px-6 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Inicia sesión para jugar
          </h2>
          <p className="text-sm text-muted-foreground">
            {message ??
              "Necesitas una identidad para guardar tu partida, comprar mejoras y aparecer en el ranking."}
          </p>
        </div>
        <Button
          type="button"
          data-ocid="auth.login_button"
          onClick={() => login()}
          disabled={isLoggingIn}
          className="rounded-full px-6"
        >
          {isLoggingIn ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
