import type { GameState } from "@/backend";
import { Progress } from "@/components/ui/progress";
import {
  POLLUTION_BAND_LABEL,
  formatMoney,
  formatNumber,
  pollutionBand,
} from "@/lib/game-types";
import { cn } from "@/lib/utils";
import { Coins, Factory, Leaf, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface StatProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "restored" | "smog" | "money";
  ocid: string;
}

function Stat({ icon, label, value, hint, tone = "default", ocid }: StatProps) {
  const toneClass =
    tone === "restored"
      ? "text-primary"
      : tone === "smog"
        ? "text-accent"
        : tone === "money"
          ? "text-warning"
          : "text-foreground";

  return (
    <div
      data-ocid={ocid}
      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60",
          toneClass,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="hud-label truncate">{label}</p>
        <p className={cn("hud-value truncate", toneClass)}>{value}</p>
        {hint ? (
          <p className="truncate text-[0.6875rem] text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface GameHudProps {
  game: GameState | null;
  /** Optional extra content rendered at the end of the bar. */
  trailing?: ReactNode;
}

/**
 * Sticky HUD stat bar: pollution, restoration, money and turn at a glance.
 * Renders a skeleton row while the game state is still loading.
 */
export function GameHud({ game, trailing }: GameHudProps) {
  if (!game) {
    return (
      <div
        data-ocid="hud.loading_state"
        className="sticky top-0 z-30 border-b border-border bg-card shadow-elevated"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          {[
            "hud-skeleton-1",
            "hud-skeleton-2",
            "hud-skeleton-3",
            "hud-skeleton-4",
          ].map((id) => (
            <div
              key={id}
              className="h-12 flex-1 animate-pulse rounded-xl bg-muted/60"
            />
          ))}
        </div>
      </div>
    );
  }

  const pollution = Number(game.pollution);
  const initial = Number(game.initialPollution);
  const band = pollutionBand(pollution, initial);
  const restoredPercent =
    initial > 0
      ? Math.max(0, Math.min(100, Math.round((1 - pollution / initial) * 100)))
      : 0;

  return (
    <div
      data-ocid="hud.panel"
      className="sticky top-0 z-30 border-b border-border bg-card shadow-elevated"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-stretch divide-x divide-border">
        <Stat
          ocid="hud.pollution"
          icon={<Factory className="size-4" />}
          label="Contaminación"
          value={formatNumber(pollution)}
          hint={POLLUTION_BAND_LABEL[band]}
          tone={band === "clean" ? "restored" : "smog"}
        />
        <Stat
          ocid="hud.restoration"
          icon={<Leaf className="size-4" />}
          label="Restauración"
          value={`${restoredPercent}%`}
          hint={`${formatNumber(game.totalRemoved)} eliminado`}
          tone="restored"
        />
        <Stat
          ocid="hud.money"
          icon={<Coins className="size-4" />}
          label="Dinero"
          value={formatMoney(game.money)}
          tone="money"
        />
        <Stat
          ocid="hud.turn"
          icon={<Sparkles className="size-4" />}
          label="Turno"
          value={formatNumber(game.turn)}
          hint={`${formatNumber(game.actionsLeft)} acciones`}
        />
        {trailing ? (
          <div className="flex items-center px-4 py-3">{trailing}</div>
        ) : null}
      </div>
      <Progress
        value={restoredPercent}
        aria-label="Progreso de restauración"
        className="h-1 rounded-none bg-muted"
      />
    </div>
  );
}
