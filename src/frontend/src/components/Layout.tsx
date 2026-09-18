import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useRouterState } from "@tanstack/react-router";
import { Leaf, LogOut, ShoppingBag, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  ocid: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/board",
    label: "Tablero",
    icon: <Leaf className="size-4" aria-hidden="true" />,
    ocid: "nav.board_link",
  },
  {
    to: "/shop",
    label: "Tienda",
    icon: <ShoppingBag className="size-4" aria-hidden="true" />,
    ocid: "nav.shop_link",
  },
  {
    to: "/ranking",
    label: "Ranking",
    icon: <Trophy className="size-4" aria-hidden="true" />,
    ocid: "nav.ranking_link",
  },
];

interface LayoutProps {
  children: ReactNode;
  /** Optional HUD bar rendered above the page content. */
  hud?: ReactNode;
}

/**
 * Shared application shell: brand header, page content, and a bottom utility
 * bar with navigation plus the session control.
 */
export function Layout({ children, hud }: LayoutProps) {
  const { isAuthenticated, login, clear, isLoggingIn } = useInternetIdentity();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card shadow-subtle">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/"
            data-ocid="nav.home_link"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex size-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
              <Leaf className="size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Planeta Limpio
            </span>
          </Link>

          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 sm:flex"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-ocid={item.ocid}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-smooth outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  pathname === item.to
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                data-ocid="nav.logout_button"
                onClick={() => clear()}
                className="rounded-full"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            ) : (
              <Button
                type="button"
                data-ocid="nav.login_button"
                onClick={() => login()}
                disabled={isLoggingIn}
                className="rounded-full"
              >
                <User className="size-4" aria-hidden="true" />
                {isLoggingIn ? "Conectando…" : "Iniciar sesión"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {hud}

      <main className="flex-1 bg-background">{children}</main>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
          <nav
            aria-label="Utilidades"
            className="flex items-center gap-1 overflow-x-auto"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-ocid={`footer.${item.ocid}`}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-smooth outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  pathname === item.to
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
