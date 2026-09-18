import { ShopItemKind } from "@/backend";
import type { GameState } from "@/backend";
import { useGameStore } from "@/lib/game-store";
import { createLocalGame, localShopItems } from "@/lib/local-game";
import { ShopPage } from "@/pages/ShopPage";
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const CITY = {
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
};

function renderShop() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ShopPage />
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

describe("ShopPage", () => {
  it("lists tool upgrades and NPC helpers with their effects", () => {
    seedGame();
    renderShop();
    expect(screen.getByText("Mejoras de herramientas")).toBeInTheDocument();
    expect(screen.getByText("Ayudantes")).toBeInTheDocument();
    expect(screen.getByText("Filtro de aire")).toBeInTheDocument();
    expect(screen.getByText("Voluntarios vecinales")).toBeInTheDocument();
  });

  it("disables items the player cannot afford", () => {
    // 120 money: the 180 € regulación and 300 € cuadrilla are unaffordable.
    seedGame();
    renderShop();
    const buttons = screen.getAllByRole("button", {
      name: /Sin dinero suficiente/i,
    });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it("buys a tool upgrade, reducing money and raising its level", async () => {
    seedGame();
    const user = userEvent.setup();
    renderShop();

    const buyButtons = screen.getAllByRole("button", { name: /^Comprar$/i });
    await user.click(buyButtons[0]);

    await waitFor(() => {
      expect(useGameStore.getState().game?.money).toBe(80n);
    });
    const game = useGameStore.getState().game;
    expect(game?.tools).toEqual([{ id: "filtro", level: 1n }]);
    // The catalogue now prices the next level higher.
    expect(
      useGameStore.getState().shop.find((item) => item.id === "filtro")?.price,
    ).toBe(80n);
  });

  it("buys an NPC helper that will clean automatically each turn", async () => {
    seedGame({ money: 500n });
    const user = userEvent.setup();
    renderShop();

    const npcSection = document.querySelector(
      '[data-ocid="shop.npcs_section"]',
    ) as HTMLElement;
    const npcBuy = npcSection.querySelector(
      '[data-ocid="shop.buy_button.1"]',
    ) as HTMLButtonElement;
    await user.click(npcBuy);

    await waitFor(() => {
      expect(useGameStore.getState().game?.npcs).toEqual([
        { id: "voluntarios", count: 1n },
      ]);
    });
    expect(useGameStore.getState().game?.money).toBe(380n);
  });

  it("shows an empty state when there is no game yet", () => {
    renderShop();
    expect(
      screen.getByText("Todavía no tienes una partida"),
    ).toBeInTheDocument();
  });

  it("keeps the shop catalogue typed by kind", () => {
    seedGame();
    renderShop();
    const shop = useGameStore.getState().shop;
    expect(
      shop.every(
        (item) =>
          item.kind === ShopItemKind.tool || item.kind === ShopItemKind.npc,
      ),
    ).toBe(true);
  });
});
