import type { LogEntry } from "@/lib/game-types";
import { formatNumber, turnEventLabel } from "@/lib/game-types";
import { cn } from "@/lib/utils";
import { ScrollText } from "lucide-react";

interface EventLogProps {
  entries: LogEntry[];
  className?: string;
}

function toneForKind(kind: string): string {
  switch (kind) {
    case "clean":
    case "npc":
      return "text-primary";
    case "money":
      return "text-warning";
    case "pollution":
      return "text-accent";
    default:
      return "text-muted-foreground";
  }
}

/** Turn-by-turn event log shown beside the board. */
export function EventLog({ entries, className }: EventLogProps) {
  return (
    <section
      data-ocid="log.panel"
      aria-label="Registro de eventos"
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-subtle",
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ScrollText
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <h3 className="hud-label">Registro de eventos</h3>
      </header>

      {entries.length === 0 ? (
        <div
          data-ocid="log.empty_state"
          className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center"
        >
          <p className="text-sm font-medium">Todavía no hay eventos</p>
          <p className="text-xs text-muted-foreground">
            Cierra un turno para ver cómo responde la ciudad.
          </p>
        </div>
      ) : (
        <ul
          data-ocid="log.list"
          className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              data-ocid="log.item"
              className="rounded-xl border border-border/60 bg-background/40 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("hud-label", toneForKind(entry.kind))}>
                  {turnEventLabel(entry.kind)}
                </span>
                <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                  T{entry.turn}
                </span>
              </div>
              <p className="mt-1 text-sm leading-snug">{entry.message}</p>
              {entry.amount !== 0 ? (
                <p
                  className={cn(
                    "mt-1 font-mono text-xs tabular-nums",
                    toneForKind(entry.kind),
                  )}
                >
                  {entry.amount > 0 ? "+" : ""}
                  {formatNumber(entry.amount)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
