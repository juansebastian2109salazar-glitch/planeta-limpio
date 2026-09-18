import { GameStatus, createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Leaf,
  Loader2,
  MapPin,
  Search,
  ShoppingBag,
  Trophy,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { STARTING_MONEY, startNewGame } from "@/lib/backend-api";
import type { GameActor } from "@/lib/backend-api";
import { useGameStore } from "@/lib/game-store";
import type { AirQuality, CitySearchResult, GameState } from "@/lib/game-types";
import {
  aqiLabel,
  aqiToInitialPollution,
  fetchAirQuality,
  searchCities,
} from "@/lib/open-meteo";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  {
    icon: <Wind className="size-5" aria-hidden="true" />,
    title: "Datos reales",
    body: "Elige cualquier ciudad del mundo y parte de su calidad del aire real, medida por Open-Meteo.",
  },
  {
    icon: <ShoppingBag className="size-5" aria-hidden="true" />,
    title: "Compra y mejora",
    body: "Invierte lo recaudado en herramientas más potentes y en vecinos que limpian a tu lado.",
  },
  {
    icon: <Trophy className="size-5" aria-hidden="true" />,
    title: "Compite",
    body: "Cada tonelada retirada cuenta. Escala en el ranking global de restauración.",
  },
];

interface PollutantRow {
  key: string;
  label: string;
  value: number | null;
  unit: string;
}

function buildPollutants(air: AirQuality): PollutantRow[] {
  return [
    { key: "pm2_5", label: "PM2.5", value: air.pm2_5, unit: "µg/m³" },
    { key: "pm10", label: "PM10", value: air.pm10, unit: "µg/m³" },
    {
      key: "no2",
      label: "NO₂",
      value: air.nitrogenDioxide,
      unit: "µg/m³",
    },
    {
      key: "so2",
      label: "SO₂",
      value: air.sulphurDioxide,
      unit: "µg/m³",
    },
    { key: "o3", label: "O₃", value: air.ozone, unit: "µg/m³" },
    {
      key: "co",
      label: "CO",
      value: air.carbonMonoxide,
      unit: "µg/m³",
    },
  ];
}

function formatPollutant(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format(value);
}

/** Difficulty copy derived from the real AQI of the chosen city. */
function difficultyCopy(aqi: number | null): {
  title: string;
  body: string;
  tone: "clean" | "moderate" | "poor" | "severe";
} {
  if (aqi === null) {
    return {
      title: "Dificultad estimada",
      body: "No hay lectura de AQI para esta ciudad; empezarás con una contaminación intermedia.",
      tone: "moderate",
    };
  }
  if (aqi <= 20) {
    return {
      title: "Dificultad baja",
      body: "El aire ya es bueno. Tu reto es mantenerlo limpio y no perder terreno.",
      tone: "clean",
    };
  }
  if (aqi <= 40) {
    return {
      title: "Dificultad moderada",
      body: "Hay margen de mejora. Con buenas herramientas restaurarás la ciudad sin agobios.",
      tone: "moderate",
    };
  }
  if (aqi <= 60) {
    return {
      title: "Dificultad alta",
      body: "La contaminación es notable. Necesitarás planificar cada turno y comprar mejoras pronto.",
      tone: "poor",
    };
  }
  return {
    title: "Dificultad extrema",
    body: "El aire está muy degradado. Solo una estrategia constante devolverá el cielo azul.",
    tone: "severe",
  };
}

const TONE_CLASS: Record<string, string> = {
  clean: "border-primary/40 bg-primary/10 text-primary",
  moderate: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  poor: "border-accent/40 bg-accent/10 text-accent",
  severe: "border-destructive/40 bg-destructive/10 text-destructive",
};

/** Landing screen: explains the game, picks a real city, and starts a run. */
export function HomePage() {
  const navigate = useNavigate();
  const { actor } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();
  const setGame = useGameStore((state) => state.setGame);
  const setAirQuality = useGameStore((state) => state.setAirQuality);
  const setError = useGameStore((state) => state.setError);
  const reset = useGameStore((state) => state.reset);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CitySearchResult | null>(null);
  const [air, setAir] = useState<AirQuality | null>(null);
  const [isLoadingAir, setIsLoadingAir] = useState(false);
  const [airError, setAirError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const searchAbort = useRef<AbortController | null>(null);
  const airAbort = useRef<AbortController | null>(null);

  // Debounced geocoding search.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      searchAbort.current?.abort();
      const controller = new AbortController();
      searchAbort.current = controller;
      searchCities(trimmed, controller.signal)
        .then((cities) => {
          setResults(cities);
          setIsSearching(false);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setIsSearching(false);
          setSearchError(
            error instanceof Error
              ? error.message
              : "No se pudo buscar la ciudad. Inténtalo de nuevo.",
          );
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  // Load real air quality whenever a city is selected.
  useEffect(() => {
    if (!selected) {
      setAir(null);
      setAirError(null);
      return;
    }

    setIsLoadingAir(true);
    setAirError(null);
    airAbort.current?.abort();
    const controller = new AbortController();
    airAbort.current = controller;

    fetchAirQuality(selected.latitude, selected.longitude, controller.signal)
      .then((reading) => {
        setAir(reading);
        setIsLoadingAir(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAir(null);
        setIsLoadingAir(false);
        setAirError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la calidad del aire de esta ciudad.",
        );
      });

    return () => controller.abort();
  }, [selected]);

  const initialPollution = useMemo(
    () => aqiToInitialPollution(air?.europeanAqi ?? null),
    [air],
  );
  const difficulty = useMemo(
    () => difficultyCopy(air?.europeanAqi ?? null),
    [air],
  );
  const pollutants = useMemo(() => (air ? buildPollutants(air) : []), [air]);

  function handleSelectCity(city: CitySearchResult) {
    setSelected(city);
    setStartError(null);
  }

  async function handleStart() {
    if (!selected) return;
    setIsStarting(true);
    setStartError(null);
    setError(null);

    const city = {
      name: selected.name,
      country: selected.country,
      region: selected.region,
      latitude: selected.latitude,
      longitude: selected.longitude,
    };

    try {
      reset();
      setAirQuality(air);

      if (isAuthenticated) {
        const state = await startNewGame(
          actor as GameActor | null,
          city,
          BigInt(initialPollution),
        );
        setGame(state);
      } else {
        const localState: GameState = {
          status: GameStatus.playing,
          money: STARTING_MONEY,
          tools: [],
          initialPollution: BigInt(initialPollution),
          city,
          npcs: [],
          turn: 0n,
          pollution: BigInt(initialPollution),
          updatedAt: BigInt(Date.now()) * 1_000_000n,
          totalRemoved: 0n,
          actionsLeft: 3n,
        };
        setGame(localState);
      }

      await navigate({ to: "/board" });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo empezar la partida. Inténtalo de nuevo.";
      setStartError(message);
      setError(message);
      setIsStarting(false);
    }
  }

  return (
    <div data-ocid="home.page" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <section className="atmosphere relative isolate overflow-hidden rounded-3xl border border-border px-6 py-14 shadow-elevated sm:px-12 sm:py-20">
        <div className="relative max-w-2xl">
          <span className="hud-label inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
            <Leaf className="size-3.5" aria-hidden="true" />
            Estrategia por turnos
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Planeta Limpio
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            El calentamiento global avanza y el aire de nuestras ciudades se
            vuelve irrespirable. Elige una ciudad real, mide su contaminación
            actual y dirige cada turno la limpieza: herramientas, mejoras y
            vecinos que se suman a la causa. Tu misión es devolverle el cielo
            azul.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              data-ocid="home.primary_button"
              className="rounded-full px-7"
              onClick={() => {
                document
                  .getElementById("city-search")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                document.getElementById("city-search-input")?.focus();
              }}
            >
              Empezar a limpiar
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              data-ocid="home.secondary_button"
              className="rounded-full px-7"
            >
              <Link to="/ranking">Ver ranking</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <article
            key={item.title}
            data-ocid="home.card"
            className="rounded-2xl border border-border bg-card p-6 shadow-subtle"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {item.icon}
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </article>
        ))}
      </section>

      <section
        id="city-search"
        data-ocid="home.section"
        className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
      >
        <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
          <p className="hud-label">Paso 1 · Elige tu ciudad</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            ¿Dónde empezamos?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Busca cualquier ciudad del mundo. Usaremos su calidad del aire real
            para fijar el punto de partida.
          </p>

          <div className="relative mt-5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="city-search-input"
              data-ocid="home.search_input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Madrid, Ciudad de México, Delhi…"
              aria-label="Buscar ciudad"
              autoComplete="off"
              className="h-11 rounded-xl pl-9"
            />
          </div>

          <div className="mt-4 min-h-[8rem]">
            {isSearching ? (
              <ul
                data-ocid="home.loading_state"
                className="space-y-2"
                aria-label="Buscando ciudades"
              >
                {Array.from({ length: 3 }, (_, i) => `city-skeleton-${i}`).map(
                  (id) => (
                    <li key={id}>
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </li>
                  ),
                )}
              </ul>
            ) : searchError ? (
              <p
                data-ocid="home.error_state"
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                {searchError}
              </p>
            ) : results.length > 0 ? (
              <ul data-ocid="home.list" className="space-y-2">
                {results.map((city, index) => {
                  const isActive = selected?.id === city.id;
                  return (
                    <li key={city.id}>
                      <button
                        type="button"
                        data-ocid={`home.item.${index + 1}`}
                        onClick={() => handleSelectCity(city)}
                        aria-pressed={isActive}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-smooth outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          isActive
                            ? "border-primary/50 bg-primary/10"
                            : "border-border bg-background hover:border-primary/40 hover:bg-muted",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-medium">
                            <MapPin
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="truncate">{city.name}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {[city.region, city.country]
                              .filter(Boolean)
                              .join(" · ") || "Sin región"}
                          </span>
                        </span>
                        {isActive ? (
                          <Check
                            className="size-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : query.trim().length >= 2 ? (
              <p
                data-ocid="home.empty_state"
                className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"
              >
                No encontramos ninguna ciudad con ese nombre. Prueba con otra
                búsqueda.
              </p>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Escribe al menos dos letras para ver resultados.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
          <p className="hud-label">Paso 2 · Calidad del aire real</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            {selected ? selected.name : "Sin ciudad seleccionada"}
          </h2>

          {!selected ? (
            <p
              data-ocid="home.empty_state"
              className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"
            >
              Selecciona una ciudad para cargar su AQI europeo y sus
              contaminantes actuales.
            </p>
          ) : isLoadingAir ? (
            <div data-ocid="home.loading_state" className="mt-5 space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from(
                  { length: 6 },
                  (_, i) => `pollutant-skeleton-${i}`,
                ).map((id) => (
                  <Skeleton key={id} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : airError ? (
            <p
              data-ocid="home.error_state"
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {airError}
            </p>
          ) : air ? (
            <div className="mt-5 space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="hud-label">AQI europeo</p>
                  <p
                    data-ocid="home.aqi_value"
                    className="hud-value mt-1 text-3xl"
                  >
                    {air.europeanAqi === null
                      ? "—"
                      : Math.round(air.europeanAqi)}
                  </p>
                </div>
                <span
                  className={cn(
                    "hud-label rounded-full border px-3 py-1",
                    TONE_CLASS[difficulty.tone],
                  )}
                >
                  {aqiLabel(air.europeanAqi)}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pollutants.map((row) => (
                  <div
                    key={row.key}
                    data-ocid="home.card"
                    className="rounded-xl border border-border bg-background p-3"
                  >
                    <dt className="hud-label">{row.label}</dt>
                    <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">
                      {formatPollutant(row.value)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {row.unit}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              <div
                data-ocid="home.panel"
                className={cn(
                  "rounded-xl border p-4",
                  TONE_CLASS[difficulty.tone],
                )}
              >
                <p className="font-display text-sm font-semibold uppercase tracking-wider">
                  {difficulty.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed opacity-90">
                  {difficulty.body}
                </p>
                <p className="mt-2 font-mono text-xs tabular-nums opacity-80">
                  Contaminación inicial: {initialPollution} · Dinero inicial:{" "}
                  {STARTING_MONEY.toString()} €
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-border pt-5">
            {startError ? (
              <p
                data-ocid="home.error_state"
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                {startError}
              </p>
            ) : null}

            <Button
              type="button"
              size="lg"
              data-ocid="home.submit_button"
              className="w-full rounded-full"
              disabled={!selected || isLoadingAir || isStarting}
              onClick={() => void handleStart()}
            >
              {isStarting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Preparando la partida…
                </>
              ) : (
                <>
                  Empezar a limpiar
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {isAuthenticated
                ? "Sesión iniciada: tu progreso se guardará en el ranking global."
                : "Juega sin iniciar sesión: podrás limpiar, pero tu progreso no se guardará."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
