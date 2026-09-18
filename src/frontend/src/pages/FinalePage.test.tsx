import { GameStatus } from "@/backend";
import type { GameState } from "@/backend";
import { useGameStore } from "@/lib/game-store";
import { createLocalGame } from "@/lib/local-game";
import { FinalePage } from "@/pages/FinalePage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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

const CITY = {
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
};

function renderFinale() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FinalePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigate.mockClear();
  useGameStore.getState().reset();
});

describe("FinalePage", () => {
  it("shows the restored-world scene and the run summary after a win", () => {
    const game: GameState = {
      ...createLocalGame(CITY, 100n, 120n),
      status: GameStatus.won,
      pollution: 0n,
      totalRemoved: 100n,
      turn: 6n,
      money: 240n,
    };
    useGameStore.getState().setGame(game);
    renderFinale();

    expect(screen.getByText("El mundo respira de nuevo")).toBeInTheDocument();
    expect(screen.getByText("Resumen de la partida")).toBeInTheDocument();
    expect(screen.getByText("Ciudad salvada")).toBeInTheDocument();
    expect(screen.getByText("Turnos usados")).toBeInTheDocument();
    expect(screen.getByText("Contaminación retirada")).toBeInTheDocument();
    expect(screen.getByText("Dinero ganado")).toBeInTheDocument();
    expect(screen.getByText("100% del aire original")).toBeInTheDocument();
  });

  it("redirects to the start screen when there is no completed run", () => {
    renderFinale();
    expect(navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });
});
