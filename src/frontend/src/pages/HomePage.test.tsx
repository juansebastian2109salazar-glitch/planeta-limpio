import { GameStatus } from "@/backend";
import { useGameStore } from "@/lib/game-store";
import { HomePage } from "@/pages/HomePage";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn().mockResolvedValue(undefined);

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#link">{children}</a>
  ),
}));

const identity = { isAuthenticated: false, isInitializing: false };
vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: null, isFetching: false }),
  useInternetIdentity: () => identity,
}));

const searchCities = vi.fn();
const fetchAirQuality = vi.fn();
vi.mock("@/lib/open-meteo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/open-meteo")>();
  return {
    ...actual,
    searchCities: (...args: unknown[]) => searchCities(...args),
    fetchAirQuality: (...args: unknown[]) => fetchAirQuality(...args),
  };
});

const MADRID = {
  id: 3117735,
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
  population: 3255944,
};

const AIR = {
  europeanAqi: 42,
  pm2_5: 12.5,
  pm10: 20,
  nitrogenDioxide: 30,
  sulphurDioxide: 4,
  ozone: 55,
  carbonMonoxide: 210,
  observedAt: "2026-09-18T12:00",
};

beforeEach(() => {
  navigate.mockClear();
  searchCities.mockReset();
  fetchAirQuality.mockReset();
  useGameStore.getState().reset();
});

describe("HomePage", () => {
  it("renders the title, premise and city search without a blank screen", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "Planeta Limpio" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar ciudad")).toBeInTheDocument();
    expect(
      screen.getByText(/El calentamiento global avanza/i),
    ).toBeInTheDocument();
  });

  it("searches for Madrid and shows the real air-quality values", async () => {
    searchCities.mockResolvedValue([MADRID]);
    fetchAirQuality.mockResolvedValue(AIR);
    const user = userEvent.setup();

    render(<HomePage />);
    await user.type(screen.getByLabelText("Buscar ciudad"), "Madrid");

    const result = await screen.findByRole("button", { name: /Madrid/i });
    await user.click(result);

    await waitFor(() => {
      expect(fetchAirQuality).toHaveBeenCalledWith(
        MADRID.latitude,
        MADRID.longitude,
        expect.anything(),
      );
    });

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("PM2.5")).toBeInTheDocument();
    expect(screen.getByText("12,5")).toBeInTheDocument();
    expect(screen.getByText("NO₂")).toBeInTheDocument();
  });

  it("starts an anonymous local game and navigates to the board", async () => {
    searchCities.mockResolvedValue([MADRID]);
    fetchAirQuality.mockResolvedValue(AIR);
    const user = userEvent.setup();

    render(<HomePage />);
    await user.type(screen.getByLabelText("Buscar ciudad"), "Madrid");
    await user.click(await screen.findByRole("button", { name: /Madrid/i }));
    await screen.findByText("42");

    await user.click(
      document.querySelector('[data-ocid="home.submit_button"]')!,
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: "/board" });
    });

    const game = useGameStore.getState().game;
    expect(game).not.toBeNull();
    expect(game?.status).toBe(GameStatus.playing);
    expect(game?.city.name).toBe("Madrid");
    expect(game?.pollution).toBe(105n);
    expect(game?.money).toBe(120n);
  });

  it("shows an empty state when no city matches the query", async () => {
    searchCities.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<HomePage />);
    await user.type(screen.getByLabelText("Buscar ciudad"), "zzzz");

    expect(
      await screen.findByText(/No encontramos ninguna ciudad/i),
    ).toBeInTheDocument();
  });
});
