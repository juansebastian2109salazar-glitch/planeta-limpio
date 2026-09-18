import {
  aqiLabel,
  aqiToInitialPollution,
  fetchAirQuality,
  searchCities,
} from "@/lib/open-meteo";
import { afterEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchCities", () => {
  it("returns an empty list for queries shorter than two characters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchCities("M")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Open-Meteo geocoding results into city search results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: 3117735,
            name: "Madrid",
            country: "España",
            admin1: "Comunidad de Madrid",
            latitude: 40.4168,
            longitude: -3.7038,
            population: 3255944,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchCities("Madrid");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 3117735,
      name: "Madrid",
      country: "España",
      region: "Comunidad de Madrid",
      latitude: 40.4168,
      longitude: -3.7038,
      population: 3255944,
    });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("geocoding-api.open-meteo.com");
    expect(calledUrl).toContain("name=Madrid");
  });

  it("returns an empty list when the API has no matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));
    await expect(searchCities("zzzz")).resolves.toEqual([]);
  });

  it("throws a Spanish error when the geocoding request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    await expect(searchCities("Madrid")).rejects.toThrow(
      "No se pudo buscar la ciudad. Inténtalo de nuevo.",
    );
  });
});

describe("fetchAirQuality", () => {
  it("normalises the current air-quality reading", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        current: {
          time: "2026-09-18T12:00",
          european_aqi: 42,
          pm2_5: 12.5,
          pm10: 20,
          nitrogen_dioxide: 30,
          sulphur_dioxide: 4,
          ozone: 55,
          carbon_monoxide: 210,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const air = await fetchAirQuality(40.4168, -3.7038);
    expect(air).toEqual({
      europeanAqi: 42,
      pm2_5: 12.5,
      pm10: 20,
      nitrogenDioxide: 30,
      sulphurDioxide: 4,
      ozone: 55,
      carbonMonoxide: 210,
      observedAt: "2026-09-18T12:00",
    });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("air-quality-api.open-meteo.com");
    expect(calledUrl).toContain("european_aqi");
  });

  it("maps missing pollutants to null instead of failing", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ current: { european_aqi: 15 } })),
    );
    const air = await fetchAirQuality(1, 2);
    expect(air.europeanAqi).toBe(15);
    expect(air.pm2_5).toBeNull();
    expect(air.observedAt).toBeNull();
  });

  it("throws a Spanish error when the air-quality request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    await expect(fetchAirQuality(1, 2)).rejects.toThrow(
      "No se pudo cargar la calidad del aire de esta ciudad.",
    );
  });
});

describe("AQI helpers", () => {
  it("labels European AQI values in Spanish", () => {
    expect(aqiLabel(null)).toBe("Sin datos");
    expect(aqiLabel(10)).toBe("Buena");
    expect(aqiLabel(30)).toBe("Aceptable");
    expect(aqiLabel(50)).toBe("Moderada");
    expect(aqiLabel(70)).toBe("Mala");
    expect(aqiLabel(90)).toBe("Muy mala");
    expect(aqiLabel(150)).toBe("Extrema");
  });

  it("maps AQI onto a bounded initial pollution budget", () => {
    expect(aqiToInitialPollution(null)).toBe(120);
    expect(aqiToInitialPollution(10)).toBe(60);
    expect(aqiToInitialPollution(40)).toBe(100);
    expect(aqiToInitialPollution(400)).toBe(400);
  });
});
