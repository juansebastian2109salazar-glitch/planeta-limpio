import { GameStatus, ShopItemKind, createActor } from "@/backend";
import type { GameState, ShopItem, TurnResult } from "@/backend";
import { AtmosphereScene } from "@/components/AtmosphereScene";
import { EventLog } from "@/components/EventLog";
import { GameHud } from "@/components/GameHud";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { loadGame, loadShop, resolveTurn } from "@/lib/backend-api";
import { eventsToLogEntries, useGameStore } from "@/lib/game-store";
import type { PlannedAction } from "@/lib/game-types";
import { formatMoney, formatNumber } from "@/lib/game-types";
import { localResolveTurn, localShopItems } from "@/lib/local-game";
import { cn } from "@/lib/utils";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  Trophy,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** Pollution removed by one use of a tool at its current level. */
function toolPower(item: ShopItem | undefined, level: number): number {
  if (!item) return 0;
  return Number(item.power) * Math.max(0, level);
}

/** Total pollution the queued actions would remove, bounded by what remains. */
function projectedRemoval(
  actions: PlannedAction[],
  tools: Map<string, ShopItem>,
  levels: Map<string, number>,
  pollution: number,
): number {
  let remaining = pollution;
  let removed = 0;
  for (const action of actions) {
    const power = toolPower(
      tools.get(action.toolId),
      levels.get(action.toolId) ?? 0,
    );
    for (let i = 0; i < action.times && remaining > 0; i += 1) {
      const step = Math.min(power, remaining);
      remaining -= step;
      removed += step;
    }
  }
  return removed;
}

interface ToolRowProps {
  item: ShopItem;
  level: number;
  queued: number;
  canAdd: boolean;
  onSetTimes: (times: number) => void;
}

function ToolRow({ item, level, queued, canAdd, onSetTimes }: ToolRowProps) {
  const power = toolPower(item, level);
  const disabled = level <= 0;

  return (
    <li
      data-ocid="board.tool_item"
      className={cn(
        "rounded-xl border border-border bg-background/40 p-3 transition-smooth",
        queued > 0 && "border-primary/50 bg-primary/5",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Nivel {level} · retira {formatNumber(power)} por acción
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
          {formatMoney(item.price)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="hud-label">
          {queued > 0 ? `${queued} en cola` : "Sin usar"}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-ocid="board.tool_decrement_button"
            aria-label={`Quitar una acción de ${item.name}`}
            disabled={disabled || queued <= 0}
            onClick={() => onSetTimes(queued - 1)}
            className="size-8 rounded-full"
          >
            <Minus className="size-3.5" aria-hidden="true" />
          </Button>
          <span
            data-ocid="board.tool_count"
            className="w-7 text-center font-mono text-sm tabular-nums"
          >
            {queued}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-ocid="board.tool_increment_button"
            aria-label={`Añadir una acción de ${item.name}`}
            disabled={disabled || !canAdd}
            onClick={() => onSetTimes(queued + 1)}
            className="size-8 rounded-full"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}

interface EndGamePanelProps {
  won: boolean;
  game: GameState;
  onRestart: () => void;
  restarting: boolean;
}

function EndGamePanel({ won, game, onRestart, restarting }: EndGamePanelProps) {
  return (
    <div
      data-ocid={won ? "board.victory_panel" : "board.defeat_panel"}
      className={cn(
        "rounded-2xl border p-6 shadow-elevated",
        won
          ? "border-primary/40 bg-primary/10"
          : "border-destructive/40 bg-destructive/10",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            won
              ? "bg-primary/20 text-primary"
              : "bg-destructive/20 text-destructive",
          )}
          aria-hidden="true"
        >
          {won ? (
            <CheckCircle2 className="size-6" />
          ) : (
            <AlertTriangle className="size-6" />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {won ? "¡Planeta restaurado!" : "La ciudad se quedó sin aliento"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {won
              ? `Has devuelto el aire limpio a ${game.city.name} en ${formatNumber(game.turn)} turnos, retirando ${formatNumber(game.totalRemoved)} unidades de contaminación.`
              : `Te has quedado sin dinero y sin acciones para seguir limpiando ${game.city.name}. Reinicia la partida o consulta el ranking.`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {won ? (
          <Button
            asChild
            data-ocid="board.finale_button"
            className="rounded-full px-6"
          >
            <Link to="/finale">
              Ver el final
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            data-ocid="board.restart_button"
            onClick={onRestart}
            disabled={restarting}
            className="rounded-full px-6"
          >
            {restarting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            {restarting ? "Reiniciando…" : "Reiniciar partida"}
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          data-ocid="board.ranking_button"
          className="rounded-full px-6"
        >
          <Link to="/ranking">
            <Trophy className="size-4" aria-hidden="true" />
            Ver ranking
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Main game board: atmosphere, cleaning actions, turn resolution and log. */
export function BoardPage() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();

  const game = useGameStore((state) => state.game);
  const shop = useGameStore((state) => state.shop);
  const plannedActions = useGameStore((state) => state.plannedActions);
  const log = useGameStore((state) => state.log);
  const isBusy = useGameStore((state) => state.isBusy);
  const error = useGameStore((state) => state.error);
  const setGame = useGameStore((state) => state.setGame);
  const setShop = useGameStore((state) => state.setShop);
  const setBusy = useGameStore((state) => state.setBusy);
  const setError = useGameStore((state) => state.setError);
  const appendLog = useGameStore((state) => state.appendLog);
  const planAction = useGameStore((state) => state.planAction);
  const clearPlannedActions = useGameStore(
    (state) => state.clearPlannedActions,
  );

  const [restarting, setRestarting] = useState(false);

  // Only signed-in players have a server-side game; anonymous runs live in the
  // store so they can play without an identity.
  const gameQuery = useQuery({
    queryKey: ["game"],
    queryFn: () => loadGame(actor),
    enabled: isAuthenticated && !!actor && !isFetching,
  });

  const shopQuery = useQuery({
    queryKey: ["shop"],
    queryFn: () => loadShop(actor),
    enabled: isAuthenticated && !!actor && !isFetching,
  });

  // Never let the server response overwrite a locally-created anonymous game.
  useEffect(() => {
    if (isAuthenticated && gameQuery.data !== undefined) {
      setGame(gameQuery.data);
    }
  }, [isAuthenticated, gameQuery.data, setGame]);

  useEffect(() => {
    if (shopQuery.data !== undefined) setShop(shopQuery.data);
  }, [shopQuery.data, setShop]);

  // Anonymous players have no server catalogue, so load the local one.
  useEffect(() => {
    if (!isAuthenticated && game) {
      setShop(localShopItems(game));
    }
  }, [isAuthenticated, game, setShop]);

  // Signed in with no saved game: send the player to city selection. Anonymous
  // players keep whatever game the store already holds.
  useEffect(() => {
    if (isAuthenticated && !gameQuery.isLoading && gameQuery.data === null) {
      void navigate({ to: "/" });
    }
  }, [isAuthenticated, gameQuery.isLoading, gameQuery.data, navigate]);

  const turnMutation = useMutation({
    mutationFn: (actions: PlannedAction[]) => {
      // Anonymous runs resolve locally; signed-in runs use the backend.
      if (!isAuthenticated) {
        const current = useGameStore.getState().game;
        if (!current) {
          throw new Error("Todavía no has empezado una partida.");
        }
        return Promise.resolve(localResolveTurn(current, actions));
      }
      return resolveTurn(actor, actions);
    },
    onMutate: () => {
      setBusy(true);
      setError(null);
    },
    onSuccess: (result: TurnResult) => {
      setGame(result.state);
      const entries = eventsToLogEntries(
        result.events,
        Number(game?.turn ?? 1),
      ).map((entry) =>
        entry.kind === "player" ? { ...entry, kind: "clean" } : entry,
      );
      appendLog(entries);
      clearPlannedActions();
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    },
    onSettled: () => {
      setBusy(false);
    },
  });

  const toolsById = useMemo(() => {
    const map = new Map<string, ShopItem>();
    for (const item of shop) {
      if (item.kind === ShopItemKind.tool) map.set(item.id, item);
    }
    return map;
  }, [shop]);

  const levelsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const tool of game?.tools ?? []) {
      map.set(tool.id, Number(tool.level));
    }
    return map;
  }, [game]);

  const ownedTools = useMemo(
    () =>
      (game?.tools ?? [])
        .map((tool) => toolsById.get(tool.id))
        .filter((item): item is ShopItem => item !== undefined),
    [game, toolsById],
  );

  const queuedById = useMemo(() => {
    const map = new Map<string, number>();
    for (const action of plannedActions) map.set(action.toolId, action.times);
    return map;
  }, [plannedActions]);

  const totalQueued = plannedActions.reduce(
    (sum, action) => sum + action.times,
    0,
  );
  const actionsLeft = Number(game?.actionsLeft ?? 0);
  const remainingActions = Math.max(0, actionsLeft - totalQueued);
  const pollution = Number(game?.pollution ?? 0);
  const initialPollution = Number(game?.initialPollution ?? 0);
  const projected = projectedRemoval(
    plannedActions,
    toolsById,
    levelsById,
    pollution,
  );
  const projectedPollution = Math.max(0, pollution - projected);

  const restoredPercent =
    initialPollution > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((1 - pollution / initialPollution) * 100)),
        )
      : 0;

  const affordableItems = shop.filter(
    (item) => Number(item.price) <= Number(game?.money ?? 0),
  );
  // Defeat mirror: no money, nothing affordable and no actions left to clean.
  const isStuck =
    !!game &&
    game.status === GameStatus.playing &&
    Number(game.money) === 0 &&
    affordableItems.length === 0 &&
    remainingActions === 0;
  const hasWon = !!game && (game.status === GameStatus.won || pollution === 0);
  const hasLost = !!game && (game.status === GameStatus.lost || isStuck);

  const handleRestart = async () => {
    setRestarting(true);
    setError(null);
    try {
      const { clearGame } = await import("@/lib/backend-api");
      await clearGame(actor);
      useGameStore.getState().reset();
      await navigate({ to: "/" });
    } catch (restartError) {
      setError(
        restartError instanceof Error
          ? restartError.message
          : "No se pudo reiniciar la partida.",
      );
    } finally {
      setRestarting(false);
    }
  };

  const isLoading =
    isAuthenticated && (gameQuery.isLoading || (!game && !gameQuery.isError));
  const loadError = isAuthenticated && (gameQuery.isError || shopQuery.isError);

  return (
    <>
      <GameHud game={game} />

      <div
        data-ocid="board.page"
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6"
      >
        {isLoading ? (
          <div
            data-ocid="board.loading_state"
            className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
          >
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">Cargando tu partida…</p>
          </div>
        ) : loadError ? (
          <div
            data-ocid="board.error_state"
            className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                No pudimos cargar la partida
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Comprueba tu conexión e inténtalo de nuevo.
              </p>
            </div>
            <Button
              type="button"
              data-ocid="board.retry_button"
              onClick={() => {
                void gameQuery.refetch();
                void shopQuery.refetch();
              }}
              className="rounded-full px-6"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : !game ? (
          <div
            data-ocid="board.empty_state"
            className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
          >
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Te llevamos a elegir ciudad…
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-6">
              <AtmosphereScene
                pollution={pollution}
                initialPollution={initialPollution}
                cityName={game.city.name}
                className="min-h-[20rem] sm:min-h-[26rem]"
              />

              <section
                data-ocid="board.restoration_panel"
                aria-label="Progreso de restauración"
                className="rounded-2xl border border-border bg-card p-5 shadow-subtle"
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="hud-label">Restauración del planeta</p>
                    <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-primary">
                      {restoredPercent}%
                    </p>
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    {formatNumber(game.totalRemoved)} eliminado
                    <br />
                    de {formatNumber(initialPollution)} inicial
                  </p>
                </div>
                <Progress
                  value={restoredPercent}
                  aria-label="Progreso de restauración del planeta"
                  className="mt-4 h-2.5 bg-muted"
                />
              </section>

              {hasWon || hasLost ? (
                <EndGamePanel
                  won={hasWon}
                  game={game}
                  onRestart={() => void handleRestart()}
                  restarting={restarting}
                />
              ) : (
                <section
                  data-ocid="board.action_panel"
                  aria-label="Acciones de limpieza"
                  className="rounded-2xl border border-border bg-card p-5 shadow-subtle"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        Acciones de limpieza
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Cada acción usa una herramienta y consume un turno de
                        trabajo.
                      </p>
                    </div>
                    <span
                      data-ocid="board.actions_left"
                      className={cn(
                        "hud-label rounded-full border px-3 py-1",
                        remainingActions > 0
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-accent/40 bg-accent/10 text-accent",
                      )}
                    >
                      {remainingActions} de {actionsLeft} acciones
                    </span>
                  </header>

                  {ownedTools.length === 0 ? (
                    <div
                      data-ocid="board.tools_empty_state"
                      className="mt-5 rounded-xl border border-dashed border-border px-5 py-8 text-center"
                    >
                      <Wind
                        className="mx-auto size-6 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-sm font-medium">
                        Aún no tienes herramientas
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Compra tu primera herramienta en la tienda para empezar
                        a limpiar.
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        data-ocid="board.shop_button"
                        className="mt-4 rounded-full px-5"
                      >
                        <Link to="/shop">Ir a la tienda</Link>
                      </Button>
                    </div>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {ownedTools.map((item) => (
                        <ToolRow
                          key={item.id}
                          item={item}
                          level={levelsById.get(item.id) ?? 0}
                          queued={queuedById.get(item.id) ?? 0}
                          canAdd={remainingActions > 0}
                          onSetTimes={(times) => planAction(item.id, times)}
                        />
                      ))}
                    </ul>
                  )}

                  <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="hud-label">Reducción prevista</span>
                      <span
                        data-ocid="board.projected_reduction"
                        className="font-mono text-sm tabular-nums text-primary"
                      >
                        −{formatNumber(projected)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      La contaminación bajaría de {formatNumber(pollution)} a{" "}
                      {formatNumber(projectedPollution)}.
                    </p>
                  </div>

                  {error ? (
                    <p
                      data-ocid="board.error_message"
                      role="alert"
                      className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      data-ocid="board.end_turn_button"
                      onClick={() => turnMutation.mutate(plannedActions)}
                      disabled={isBusy || turnMutation.isPending}
                      className="rounded-full px-6"
                    >
                      {isBusy || turnMutation.isPending ? (
                        <Loader2
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Sparkles className="size-4" aria-hidden="true" />
                      )}
                      {isBusy || turnMutation.isPending
                        ? "Cerrando turno…"
                        : "Cerrar turno"}
                    </Button>
                    {totalQueued > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        data-ocid="board.clear_actions_button"
                        onClick={clearPlannedActions}
                        disabled={isBusy || turnMutation.isPending}
                        className="rounded-full"
                      >
                        Vaciar cola
                      </Button>
                    ) : null}
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Coins className="size-3.5" aria-hidden="true" />
                      Ganas dinero según lo que limpies
                    </span>
                  </div>
                </section>
              )}
            </div>

            <EventLog entries={log} className="min-h-[18rem] lg:min-h-0" />
          </div>
        )}
      </div>
    </>
  );
}
