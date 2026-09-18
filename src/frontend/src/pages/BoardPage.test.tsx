import { GameStatus, ShopItemKind } from "@/backend";
import type { GameState } from "@/backend";
import { useGameStore } from "@/lib/game-store";
import {
  createLocalGame,
  localPurchase,
  localShopItems,
} from "@/lib/local-game";
import { BoardPage } from "@/pages/BoardPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const CITY = {
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
};

function renderBoard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BoardPage />
    </QueryClientProvider>,
  );
}

function seedGame(overrides: Partial<GameState> = {}): GameState {
  const base = createLocalGame(CITY, 100n, 120n);
  const game = { ...base, ...overrides };
  useGameStore.getState().setGame(game);
  useGameStore.getState().setShop(localShopItems(game));
  return game;
}

beforeEach(() => {
  navigate.mockClear();
  useGameStore.getState().reset();
});

describe("BoardPage", () => {
  it("shows the board with pollution, money and actions visible", () => {
    seedGame();
    renderBoard();
    expect(screen.getByText("Madrid")).toBeInTheDocument();
    expect(screen.getByText("Contaminación")).toBeInTheDocument();
    expect(screen.getByText("Dinero")).toBeInTheDocument();
    expect(screen.getByText("3 de 3 acciones")).toBeInTheDocument();
  });

  it("prompts the player to buy a tool when none is owned", () => {
    seedGame();
    renderBoard();
    expect(screen.getByText("Aún no tienes herramientas")).toBeInTheDocument();
  });

  it("reduces pollution and increases money when a turn is closed", async () => {
    // Own a filtro (level 1, 4 per action) and queue two actions.
    const owned = localPurchase(createLocalGame(CITY, 100n, 120n), "filtro");
    seedGame({ tools: owned.tools, money: owned.money });
    const user = userEvent.setup();
    renderBoard();

    await user.click(
      screen.getByRole("button", {
        name: /Añadir una acción de Filtro de aire/i,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: /Añadir una acción de Filtro de aire/i,
      }),
    );

    expect(screen.getByText("2 en cola")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cerrar turno/i }));

    await waitFor(() => {
      expect(useGameStore.getState().game?.pollution).toBe(92n);
    });
    // 8 removed * 2 = 16 earned, starting from 80 after the purchase.
    expect(useGameStore.getState().game?.money).toBe(96n);
    expect(useGameStore.getState().game?.turn).toBe(2n);
    expect(useGameStore.getState().log.length).toBeGreaterThan(0);
  });

  it("shows the victory panel and a link to the finale when pollution hits zero", () => {
    seedGame({ pollution: 0n, status: GameStatus.won, totalRemoved: 100n });
    renderBoard();
    expect(screen.getByText("¡Planeta restaurado!")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver el final/i }),
    ).toBeInTheDocument();
  });

  it("shows the defeat panel when the player is stuck", () => {
    seedGame({
      money: 0n,
      actionsLeft: 0n,
      status: GameStatus.playing,
      tools: [],
    });
    renderBoard();
    expect(
      screen.getByText("La ciudad se quedó sin aliento"),
    ).toBeInTheDocument();
  });

  it("keeps the shop catalogue consistent with the local engine", () => {
    seedGame();
    renderBoard();
    const shop = useGameStore.getState().shop;
    expect(shop.some((item) => item.kind === ShopItemKind.tool)).toBe(true);
    expect(shop.some((item) => item.kind === ShopItemKind.npc)).toBe(true);
  });
});
