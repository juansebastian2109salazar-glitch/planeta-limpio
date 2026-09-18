import type { AirQuality, CitySearchResult } from "@/lib/game-types";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const AIR_QUALITY_FIELDS = [
  "european_aqi",
  "pm2_5",
  "pm10",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "ozone",
  "carbon_monoxide",
].join(",");

interface GeocodingResponse {
  results?: Array<{
    id: number;
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    population?: number;
  }>;
}

interface AirQualityResponse {
  current?: {
    time?: string;
    european_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
    carbon_monoxide?: number;
  };
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Search cities by name through the Open-Meteo geocoding API (no key required).
 * Returns an empty list for blank queries or when nothing matches.
 */
export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    name: trimmed,
    count: "8",
    language: "es",
    format: "json",
  });

  const response = await fetch(`${GEOCODING_URL}?${params.toString()}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error("No se pudo buscar la ciudad. Inténtalo de nuevo.");
  }

  const data = (await response.json()) as GeocodingResponse;
  return (data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    country: result.country ?? "",
    region: result.admin1 ?? "",
    latitude: result.latitude,
    longitude: result.longitude,
    population: toNumber(result.population),
  }));
}

/**
 * Fetch the current air quality for a coordinate pair from Open-Meteo.
 * Missing pollutants come back as null so the UI can render a fallback.
 */
export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<AirQuality> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: AIR_QUALITY_FIELDS,
    timezone: "auto",
  });

  const response = await fetch(`${AIR_QUALITY_URL}?${params.toString()}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error("No se pudo cargar la calidad del aire de esta ciudad.");
  }

  const data = (await response.json()) as AirQualityResponse;
  const current = data.current ?? {};

  return {
    europeanAqi: toNumber(current.european_aqi),
    pm2_5: toNumber(current.pm2_5),
    pm10: toNumber(current.pm10),
    nitrogenDioxide: toNumber(current.nitrogen_dioxide),
    sulphurDioxide: toNumber(current.sulphur_dioxide),
    ozone: toNumber(current.ozone),
    carbonMonoxide: toNumber(current.carbon_monoxide),
    observedAt: current.time ?? null,
  };
}

/** Spanish severity label for a European AQI value. */
export function aqiLabel(aqi: number | null): string {
  if (aqi === null) return "Sin datos";
  if (aqi <= 20) return "Buena";
  if (aqi <= 40) return "Aceptable";
  if (aqi <= 60) return "Moderada";
  if (aqi <= 80) return "Mala";
  if (aqi <= 100) return "Muy mala";
  return "Extrema";
}

/** Map a European AQI value onto the initial pollution budget for a new game. */
export function aqiToInitialPollution(aqi: number | null): number {
  if (aqi === null) return 120;
  return Math.max(60, Math.min(400, Math.round(aqi * 2.5)));
}
