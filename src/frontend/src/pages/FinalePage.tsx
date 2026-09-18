import { createActor } from "@/backend";
import { AtmosphereScene } from "@/components/AtmosphereScene";
import { Button } from "@/components/ui/button";
import { type GameActor, clearGame } from "@/lib/backend-api";
import { useGameStore } from "@/lib/game-store";
import { formatMoney, formatNumber } from "@/lib/game-types";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Coins,
  Factory,
  Leaf,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useEffect } from "react";

interface SummaryStat {
  icon: typeof Leaf;
  label: string;
  value: string;
  hint: string;
  tone: "restored" | "smog" | "money" | "default";
}

/**
 * Final scene: the protagonist looks out over the restored world. Reached when
 * the player brings pollution to zero; shows the run summary and the two
 * closing actions (play again, view ranking).
 */
export function FinalePage() {
  const game = useGameStore((state) => state.game);
  const reset = useGameStore((state) => state.reset);
  const setError = useGameStore((state) => state.setError);
  const { actor } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();
  const navigate = useNavigate();

  const isWon = game?.status === "won";

  // Arriving without a completed run sends the player back to the start screen.
  useEffect(() => {
    if (!isWon) {
      void navigate({ to: "/", replace: true });
    }
  }, [isWon, navigate]);

  const playAgain = useMutation({
    mutationFn: async () => {
      // Anonymous runs are local only: nothing to clear on the server.
      if (isAuthenticated) {
        await clearGame(actor as GameActor | null);
      }
    },
    onSuccess: () => {
      reset();
      void navigate({ to: "/", replace: true });
    },
    onError: () => {
      setError("No se pudo reiniciar la partida. Inténtalo de nuevo.");
    },
  });

  if (!game || !isWon) {
    return (
      <div
        data-ocid="finale.loading_state"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p className="text-sm">Preparando el final de la historia…</p>
      </div>
    );
  }

  const initial = Number(game.initialPollution);
  const removed = Number(game.totalRemoved);
  const restoredPercent =
    initial > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((1 - Number(game.pollution) / initial) * 100),
          ),
        )
      : 100;

  const summary: SummaryStat[] = [
    {
      icon: Leaf,
      label: "Ciudad salvada",
      value: game.city.name,
      hint: game.city.country,
      tone: "restored",
    },
    {
      icon: Sparkles,
      label: "Turnos usados",
      value: formatNumber(game.turn),
      hint: "hasta respirar de nuevo",
      tone: "default",
    },
    {
      icon: Factory,
      label: "Contaminación retirada",
      value: formatNumber(removed),
      hint: `${restoredPercent}% del aire original`,
      tone: "smog",
    },
    {
      icon: Coins,
      label: "Dinero ganado",
      value: formatMoney(game.money),
      hint: "invertido en limpiar",
      tone: "money",
    },
  ];

  return (
    <div
      data-ocid="finale.page"
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
    >
      {/* Hero: the protagonist contemplating the restored world */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-border shadow-elevated">
        <img
          src="/assets/generated/finale-restored-world.dim_1536x864.jpg"
          alt="Una persona contempla desde una colina un mundo restaurado: bosques verdes, un río limpio y un cielo azul despejado."
          className="h-[22rem] w-full object-cover sm:h-[30rem]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <span className="hud-label inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
            <Leaf className="size-3.5" aria-hidden="true" />
            Planeta restaurado
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
            El mundo respira de nuevo
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {game.city.name} ha vuelto a tener un cielo limpio. Lo que empezó
            como una ciudad gris es hoy un horizonte azul.
          </p>
        </div>
      </section>

      {/* Narrative passage */}
      <section
        data-ocid="finale.narrative"
        className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-subtle sm:p-8"
      >
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          El aire vuelve a moverse
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Al principio apenas se notaba: una franja de cielo más clara entre
            la niebla, un amanecer que ya no dolía mirar. Después llegaron los
            pájaros, y con ellos el sonido que la ciudad había olvidado.
          </p>
          <p>
            Desde la colina, el protagonista contempla lo que ayudó a construir.
            Los árboles respiran, el río corre transparente y las turbinas giran
            despacio sobre un horizonte que ya no está envenenado. No fue un
            solo gesto heroico, sino cientos de turnos pequeños: cada
            herramienta comprada, cada vecino que se sumó, cada decisión de
            limpiar un poco más.
          </p>
          <p className="font-medium text-foreground">
            El planeta no pide milagros. Pide constancia, y hoy por fin respira.
          </p>
        </div>
      </section>

      {/* Restored atmosphere scene */}
      <section className="mt-8">
        <AtmosphereScene
          pollution={0}
          initialPollution={initial}
          cityName={game.city.name}
          className="min-h-[18rem] sm:min-h-[22rem]"
        />
      </section>

      {/* Run summary */}
      <section data-ocid="finale.summary" className="mt-8">
        <h2 className="hud-label">Resumen de la partida</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((stat) => {
            const Icon = stat.icon;
            const toneClass =
              stat.tone === "restored"
                ? "text-primary"
                : stat.tone === "smog"
                  ? "text-accent"
                  : stat.tone === "money"
                    ? "text-warning"
                    : "text-foreground";
            return (
              <article
                key={stat.label}
                data-ocid="finale.summary_card"
                className="rounded-2xl border border-border bg-card p-5 shadow-subtle"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-xl bg-muted/60 ${toneClass}`}
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <p className="hud-label mt-4">{stat.label}</p>
                <p className={`hud-value mt-1 truncate ${toneClass}`}>
                  {stat.value}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {stat.hint}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Closing actions */}
      <section className="mt-10 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          data-ocid="finale.primary_button"
          onClick={() => playAgain.mutate()}
          disabled={playAgain.isPending}
          className="rounded-full px-7"
        >
          {playAgain.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="size-4" aria-hidden="true" />
          )}
          Jugar de nuevo
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          data-ocid="finale.secondary_button"
          className="rounded-full px-7"
        >
          <Link to="/ranking">
            <Trophy className="size-4" aria-hidden="true" />
            Ver el ranking
          </Link>
        </Button>
      </section>
    </div>
  );
}
