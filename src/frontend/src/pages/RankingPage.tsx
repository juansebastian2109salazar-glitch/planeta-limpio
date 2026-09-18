import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  Leaf,
  Loader2,
  MapPin,
  Play,
  ShieldCheck,
  Trophy,
  User,
} from "lucide-react";
import { useState } from "react";

import { loadGame, loadRanking } from "@/lib/backend-api";
import { useGameStore } from "@/lib/game-store";
import {
  type GameState,
  type RankingEntry,
  formatMoney,
  formatNumber,
  formatUpdatedAt,
} from "@/lib/game-types";
import { cn } from "@/lib/utils";

const RANKING_QUERY_KEY = ["ranking"] as const;

/** Medal tone for the top three positions. */
function rankTone(position: number): string {
  if (position === 1) return "text-warning";
  if (position === 2) return "text-chart-3";
  if (position === 3) return "text-accent";
  return "text-muted-foreground";
}

function RankBadge({ position }: { position: number }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background font-mono text-sm font-semibold tabular-nums",
        rankTone(position),
      )}
    >
      {position}
    </span>
  );
}

function RankingSkeleton() {
  return (
    <div data-ocid="ranking.loading_state" className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => `ranking-skeleton-${i}`).map(
        (id) => (
          <Skeleton key={id} className="h-14 w-full rounded-xl" />
        ),
      )}
    </div>
  );
}

function RankingTable({
  entries,
  callerRank,
}: {
  entries: RankingEntry[];
  callerRank: bigint | null;
}) {
  return (
    <div
      data-ocid="ranking.table"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle"
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16 pl-4">Pos.</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead className="text-right">Contaminación retirada</TableHead>
            <TableHead className="pr-4 text-right">Turnos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const position = index + 1;
            const isCaller =
              callerRank !== null && callerRank === BigInt(position);
            return (
              <TableRow
                key={`${entry.player.toString()}-${position}`}
                data-ocid={`ranking.row.${position}`}
                className={cn(
                  isCaller &&
                    "bg-primary/10 hover:bg-primary/15 [&>td]:border-y [&>td]:border-primary/30",
                )}
              >
                <TableCell className="pl-4">
                  <span className="flex items-center gap-2">
                    <RankBadge position={position} />
                    {position === 1 ? (
                      <Crown
                        className="size-4 text-warning"
                        aria-label="Primer puesto"
                      />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="max-w-[14rem]">
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium">
                      {entry.cityName}
                    </span>
                    {isCaller ? (
                      <span className="hud-label shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
                        Tú
                      </span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-primary">
                  {formatNumber(entry.totalRemoved)}
                </TableCell>
                <TableCell className="pr-4 text-right font-mono tabular-nums text-muted-foreground">
                  {formatNumber(entry.turn)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SavedGameCard({
  game,
  onContinue,
  isContinuing,
}: {
  game: GameState;
  onContinue: () => void;
  isContinuing: boolean;
}) {
  const restoredPercent =
    Number(game.initialPollution) > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (1 - Number(game.pollution) / Number(game.initialPollution)) *
                100,
            ),
          ),
        )
      : 0;

  return (
    <section
      data-ocid="ranking.saved_game_card"
      className="rounded-2xl border border-border bg-card p-6 shadow-subtle"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="hud-label">Tu partida guardada</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight">
            <MapPin
              className="size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">{game.city.name}</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Último guardado: {formatUpdatedAt(game.updatedAt)}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Leaf className="size-5" aria-hidden="true" />
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-background p-3">
          <dt className="hud-label">Restauración</dt>
          <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-primary">
            {restoredPercent}%
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <dt className="hud-label">Retirado</dt>
          <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {formatNumber(game.totalRemoved)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <dt className="hud-label">Dinero</dt>
          <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-warning">
            {formatMoney(game.money)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <dt className="hud-label">Turno</dt>
          <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {formatNumber(game.turn)}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        size="lg"
        data-ocid="ranking.continue_button"
        className="mt-5 w-full rounded-full sm:w-auto sm:px-7"
        disabled={isContinuing}
        onClick={onContinue}
      >
        {isContinuing ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando partida…
          </>
        ) : (
          <>
            <Play className="size-4" aria-hidden="true" />
            Continuar partida
          </>
        )}
      </Button>
    </section>
  );
}

/** Sign-in prompt shown to anonymous visitors. */
function SignInPrompt() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div
      data-ocid="ranking.signin_prompt"
      className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-subtle"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ShieldCheck className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Inicia sesión para competir
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Con tu identidad de Internet Identity guardamos tu progreso y tu
          partida entra en el ranking global de restauración. Puedes seguir
          jugando sin cuenta, pero entonces tu avance no se guardará ni
          aparecerá en la clasificación.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        data-ocid="ranking.login_button"
        className="rounded-full px-7"
        disabled={isLoggingIn}
        onClick={() => login()}
      >
        {isLoggingIn ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Iniciando sesión…
          </>
        ) : (
          <>
            <User className="size-4" aria-hidden="true" />
            Iniciar sesión
          </>
        )}
      </Button>
      <Button
        asChild
        variant="ghost"
        data-ocid="ranking.play_without_account_button"
        className="rounded-full"
      >
        <Link to="/">Jugar sin cuenta</Link>
      </Button>
    </div>
  );
}

/** Global leaderboard plus the signed-in player's saved game. */
export function RankingPage() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated, isInitializing } = useInternetIdentity();
  const setGame = useGameStore((state) => state.setGame);
  const setError = useGameStore((state) => state.setError);
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

  const rankingQuery = useQuery({
    queryKey: RANKING_QUERY_KEY,
    queryFn: async () => loadRanking(actor),
    enabled: isAuthenticated && !!actor && !isFetching,
  });

  const gameQuery = useQuery({
    queryKey: ["saved-game"],
    queryFn: async () => loadGame(actor),
    enabled: isAuthenticated && !!actor && !isFetching,
  });

  async function handleContinue() {
    setIsContinuing(true);
    setContinueError(null);
    try {
      const saved = await loadGame(actor);
      if (!saved) {
        setContinueError(
          "No encontramos ninguna partida guardada. Empieza una nueva desde el inicio.",
        );
        setIsContinuing(false);
        return;
      }
      setGame(saved);
      await navigate({ to: "/board" });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar tu partida. Inténtalo de nuevo.";
      setContinueError(message);
      setError(message);
      setIsContinuing(false);
    }
  }

  const ranking = rankingQuery.data;
  const entries = ranking?.entries ?? [];
  const callerRank =
    ranking?.callerRank !== undefined ? ranking.callerRank : null;
  const savedGame = gameQuery.data ?? null;

  return (
    <div
      data-ocid="ranking.page"
      className="mx-auto max-w-5xl px-4 py-8 sm:px-6"
    >
      <header className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <Trophy className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ranking global
          </h1>
          <p className="text-sm text-muted-foreground">
            Quién ha retirado más contaminación del planeta.
          </p>
        </div>
      </header>

      {isInitializing ? (
        <div
          data-ocid="ranking.loading_state"
          className="mt-8 flex min-h-[30vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          <p className="text-sm">Comprobando tu sesión…</p>
        </div>
      ) : !isAuthenticated ? (
        <div className="mt-8">
          <SignInPrompt />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {callerRank !== null ? (
            <section
              data-ocid="ranking.caller_rank_card"
              className="flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/10 p-5"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Trophy className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="hud-label text-primary">Tu posición</p>
                <p className="hud-value mt-1 text-3xl text-primary">
                  #{formatNumber(callerRank)}
                </p>
              </div>
              <p className="ml-auto hidden max-w-[16rem] text-right text-xs text-muted-foreground sm:block">
                Sigue limpiando para escalar posiciones en la clasificación
                global.
              </p>
            </section>
          ) : null}

          {savedGame ? (
            <SavedGameCard
              game={savedGame}
              onContinue={() => void handleContinue()}
              isContinuing={isContinuing}
            />
          ) : null}

          {continueError ? (
            <p
              data-ocid="ranking.error_state"
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {continueError}
            </p>
          ) : null}

          <section aria-labelledby="ranking-table-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="ranking-table-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Clasificación
              </h2>
              {rankingQuery.isFetching ? (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Actualizando…
                </span>
              ) : null}
            </div>

            {rankingQuery.isLoading ? (
              <RankingSkeleton />
            ) : rankingQuery.isError ? (
              <div
                data-ocid="ranking.error_state"
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center"
              >
                <AlertTriangle
                  className="mx-auto size-6 text-destructive"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-medium text-destructive">
                  No se pudo cargar el ranking.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rankingQuery.error instanceof Error
                    ? rankingQuery.error.message
                    : "Comprueba tu conexión e inténtalo de nuevo."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  data-ocid="ranking.retry_button"
                  className="mt-4 rounded-full"
                  onClick={() => void rankingQuery.refetch()}
                >
                  Reintentar
                </Button>
              </div>
            ) : entries.length === 0 ? (
              <div
                data-ocid="ranking.empty_state"
                className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"
              >
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Leaf className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-medium">
                  Aún no hay posiciones
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Termina una partida para entrar en la clasificación. El primer
                  puesto está libre.
                </p>
                <Button
                  asChild
                  data-ocid="ranking.empty_state_button"
                  className="mt-5 rounded-full px-6"
                >
                  <Link to="/">
                    Empezar a limpiar
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ) : (
              <RankingTable entries={entries} callerRank={callerRank} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
