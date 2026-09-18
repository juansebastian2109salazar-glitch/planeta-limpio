import { POLLUTION_BAND_LABEL, pollutionBand } from "@/lib/game-types";
import { cn } from "@/lib/utils";

interface AtmosphereSceneProps {
  pollution: number;
  initialPollution: number;
  cityName: string;
  className?: string;
}

/**
 * The signature atmosphere layer: a layered twilight gradient that flips from
 * amber smog at the polluted pole to clean cyan-green as the city is restored.
 * The skyline silhouette and smog particles scale with the pollution level.
 */
export function AtmosphereScene({
  pollution,
  initialPollution,
  cityName,
  className,
}: AtmosphereSceneProps) {
  const ratio =
    initialPollution > 0
      ? Math.max(0, Math.min(1, pollution / initialPollution))
      : 0;
  const band = pollutionBand(pollution, initialPollution);
  const smogOpacity = 0.15 + ratio * 0.7;
  const skyOpacity = 1 - ratio * 0.75;

  return (
    <div
      data-ocid="board.atmosphere"
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-border",
        className,
      )}
      style={{ backgroundImage: "var(--gradient-atmosphere)" }}
    >
      {/* Clean-sky wash that grows as the city is restored */}
      <div
        className="absolute inset-0 gradient-restored transition-smooth"
        style={{ opacity: skyOpacity * 0.55 }}
        aria-hidden="true"
      />

      {/* Smog haze that lifts as pollution drops */}
      <div
        className={cn(
          "absolute inset-0 gradient-smog transition-smooth",
          ratio > 0.7 && "animate-pulse-smog",
        )}
        style={{ opacity: smogOpacity * 0.5 }}
        aria-hidden="true"
      />

      {/* Sun / clean-air disc */}
      <div
        className="absolute right-[12%] top-[14%] size-24 rounded-full bg-primary/40 blur-2xl transition-smooth sm:size-32"
        style={{ opacity: 0.35 + (1 - ratio) * 0.5 }}
        aria-hidden="true"
      />

      {/* Skyline silhouette */}
      <svg
        className="absolute inset-x-0 bottom-0 h-1/2 w-full text-background/80"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0 120V70h22V52h18v18h20V38h26v32h18V58h22v12h20V30h28v40h18V48h24v22h20V64h22v6h20V44h26v26h18V56h22v14h20V36h26v34h18V60h22v10h20V50h24v20h20v50z"
        />
      </svg>

      {/* Foreground ground plane */}
      <div
        className="absolute inset-x-0 bottom-0 h-16 bg-background/70 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="hud-label">Ciudad en juego</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {cityName}
            </h2>
          </div>
          <span
            data-ocid="board.band_badge"
            className={cn(
              "hud-label rounded-full border px-3 py-1",
              band === "clean"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-accent/40 bg-accent/10 text-accent",
            )}
          >
            {POLLUTION_BAND_LABEL[band]}
          </span>
        </div>

        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <p className="hud-label">Nivel de contaminación</p>
            <p className="font-mono text-sm tabular-nums text-muted-foreground">
              {Math.round(ratio * 100)}%
            </p>
          </div>
          <div
            className="mt-2 h-3 w-full overflow-hidden rounded-full bg-background/60"
            role="progressbar"
            tabIndex={0}
            aria-label="Nivel de contaminación"
            aria-valuenow={Math.round(ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full transition-smooth",
                band === "clean" ? "gradient-restored" : "gradient-smog",
              )}
              style={{ width: `${Math.max(4, ratio * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
