import type {
  City,
  GameState,
  GameStatus,
  Npc,
  RankingEntry,
  RankingView,
  ShopItem,
  ShopItemKind,
  ToolUpgrade,
  TurnEvent,
  TurnResult,
} from "@/backend";

export type {
  City,
  GameState,
  GameStatus,
  Npc,
  RankingEntry,
  RankingView,
  ShopItem,
  ShopItemKind,
  ToolUpgrade,
  TurnEvent,
  TurnResult,
};

/** A single line in the player's turn log, kept in the shared game store. */
export interface LogEntry {
  id: string;
  turn: number;
  kind: string;
  message: string;
  amount: number;
}

/** A cleaning action queued by the player for the current turn. */
export interface PlannedAction {
  toolId: string;
  times: number;
}

/** The city the player is currently cleaning, plus its live air quality. */
export interface CitySelection {
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
}

/** Normalised air-quality reading from Open-Meteo (all values may be missing). */
export interface AirQuality {
  europeanAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  nitrogenDioxide: number | null;
  sulphurDioxide: number | null;
  ozone: number | null;
  carbonMonoxide: number | null;
  observedAt: string | null;
}

/** A geocoding search result from Open-Meteo. */
export interface CitySearchResult {
  id: number;
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  population: number | null;
}

/** Pollution band used to drive colour, copy and the atmosphere scene. */
export type PollutionBand = "clean" | "moderate" | "poor" | "severe";

export function pollutionBand(
  pollution: number,
  initial: number,
): PollutionBand {
  const ratio = initial > 0 ? pollution / initial : 0;
  if (ratio <= 0.25) return "clean";
  if (ratio <= 0.55) return "moderate";
  if (ratio <= 0.8) return "poor";
  return "severe";
}

export const POLLUTION_BAND_LABEL: Record<PollutionBand, string> = {
  clean: "Aire limpio",
  moderate: "Aire moderado",
  poor: "Aire contaminado",
  severe: "Aire crítico",
};

/** Spanish label for a backend turn-event kind. */
export function turnEventLabel(kind: string): string {
  switch (kind) {
    case "clean":
      return "Limpieza";
    case "npc":
      return "Vecinos";
    case "money":
      return "Ingresos";
    case "pollution":
      return "Contaminación";
    case "turn":
      return "Turno";
    default:
      return "Aviso";
  }
}

/** Format a bigint/number as an integer with Spanish thousands separators. */
export function formatNumber(value: bigint | number): string {
  const numeric = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(
    numeric,
  );
}

/** Format a money amount with the euro sign. */
export function formatMoney(value: bigint | number): string {
  return `${formatNumber(value)} €`;
}

/** Convert a Motoko nanosecond timestamp into a Date, or null when invalid. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Short relative-ish label for the last save time. */
export function formatUpdatedAt(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "sin guardar";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
