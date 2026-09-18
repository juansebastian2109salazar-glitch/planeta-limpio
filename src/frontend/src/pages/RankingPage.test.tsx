import { GameStatus } from "@/backend";
import type { GameState, RankingView } from "@/backend";
import { useGameStore } from "@/lib/game-store";
import { createLocalGame } from "@/lib/local-game";
import { RankingPage } from "@/pages/RankingPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn().mockResolvedValue(undefined);
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#link">{children}</a>
  ),
}));

const identity = {
  isAuthenticated: true,
  isInitializing: false,
  login: vi.fn(),
  isLoggingIn: false,
};
vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: {}, isFetching: false }),
  useInternetIdentity: () => identity,
}));

const loadRanking = vi.fn();
const loadGame = vi.fn();
vi.mock("@/lib/backend-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend-api")>();
  return {
    ...actual,
    loadRanking: (...args: unknown[]) => loadRanking(...args),
    loadGame: (...args: unknown[]) => loadGame(...args),
  };
});

const CITY = {
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
};

const PLAYER = "aaaaa-aa" as unknown as GameState["city"] extends never
  ? never
  : import("@icp-sdk/core/principal").Principal;

function rankingView(): RankingView {
  return {
    callerRank: 2n,
    entries: [
      {
        player: PLAYER,
        turn: 9n,
        cityName: "Delhi",
        totalRemoved: 500n,
      },
      {
        player: PLAYER,
        turn: 7n,
        cityName: "Madrid",
        totalRemoved: 300n,
      },
    ],
  };
}

function renderRanking() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RankingPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigate.mockClear();
  loadRanking.mockReset();
  loadGame.mockReset();
  useGameStore.getState().reset();
});

describe("RankingPage", () => {
  it("lists players ordered by pollution removed and highlights the caller", async () => {
    loadRanking.mockResolvedValue(rankingView());
    loadGame.mockResolvedValue(null);
    renderRanking();

    expect(await screen.findByText("Delhi")).toBeInTheDocument();
    expect(screen.getByText("Madrid")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    // The caller's own position is called out.
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("Tú")).toBeInTheDocument();
  });

  it("shows an empty state when nobody has a position yet", async () => {
    loadRanking.mockResolvedValue({ entries: [] } satisfies RankingView);
    loadGame.mockResolvedValue(null);
    renderRanking();

    expect(
      await screen.findByText("Aún no hay posiciones"),
    ).toBeInTheDocument();
  });

  it("shows the saved game card for a signed-in player", async () => {
    loadRanking.mockResolvedValue({ entries: [] } satisfies RankingView);
    loadGame.mockResolvedValue(
      createLocalGame(CITY, 100n, 120n) satisfies GameState,
    );
    renderRanking();

    expect(await screen.findByText("Tu partida guardada")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Continuar partida/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows a sign-in prompt for anonymous visitors", async () => {
    identity.isAuthenticated = false;
    loadRanking.mockResolvedValue({ entries: [] } satisfies RankingView);
    loadGame.mockResolvedValue(null);
    renderRanking();

    expect(
      await screen.findByText("Inicia sesión para competir"),
    ).toBeInTheDocument();
    identity.isAuthenticated = true;
  });
});
