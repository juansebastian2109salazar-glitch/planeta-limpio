import { GameStatus, ShopItemKind } from "@/backend";
import type { GameState, RankingView, ShopItem, TurnResult } from "@/backend";
import {
  BackendError,
  RANKING_LIMIT,
  STARTING_MONEY,
  buyItem,
  clearGame,
  loadGame,
  loadRanking,
  loadShop,
  resolveTurn,
  startNewGame,
} from "@/lib/backend-api";
import type { GameActor } from "@/lib/backend-api";
import { describe, expect, it, vi } from "vitest";

const CITY = {
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
};

function gameState(overrides: Partial<GameState> = {}): GameState {
  return {
    status: GameStatus.playing,
    money: 120n,
    tools: [],
    initialPollution: 100n,
    city: CITY,
    npcs: [],
    turn: 1n,
    pollution: 100n,
    updatedAt: 1n,
    totalRemoved: 0n,
    actionsLeft: 3n,
    ...overrides,
  };
}

function shopItem(overrides: Partial<ShopItem> = {}): ShopItem {
  return {
    id: "filtro",
    owned: 0n,
    kind: ShopItemKind.tool,
    name: "Filtro de aire",
    description: "Captura partículas.",
    power: 4n,
    price: 40n,
    ...overrides,
  };
}

/** A typed actor mock: every method the app depends on, no network. */
function mockActor(overrides: Partial<GameActor> = {}): GameActor {
  return {
    newGame: vi.fn().mockResolvedValue({ __kind__: "ok", ok: gameState() }),
    getGame: vi.fn().mockResolvedValue(null),
    getShop: vi.fn().mockResolvedValue([]),
    purchase: vi.fn().mockResolvedValue({ __kind__: "ok", ok: gameState() }),
    endTurn: vi.fn().mockResolvedValue({
      __kind__: "ok",
      ok: {
        state: gameState(),
        events: [],
        moneyEarned: 0n,
        pollutionRemoved: 0n,
      } satisfies TurnResult,
    }),
    resetGame: vi.fn().mockResolvedValue(undefined),
    getRanking: vi.fn().mockResolvedValue({
      entries: [],
    } satisfies RankingView),
    ...overrides,
  };
}

describe("backend-api consumer contract", () => {
  it("starts a new game with the app's starting money", async () => {
    const actor = mockActor();
    await startNewGame(actor, CITY, 100n);
    expect(actor.newGame).toHaveBeenCalledWith(CITY, 100n, STARTING_MONEY);
  });

  it("surfaces a backend new-game error as a BackendError", async () => {
    const actor = mockActor({
      newGame: vi.fn().mockResolvedValue({
        __kind__: "err",
        err: "invalidCity",
      }),
    });
    await expect(startNewGame(actor, CITY, 100n)).rejects.toBeInstanceOf(
      BackendError,
    );
    await expect(startNewGame(actor, CITY, 100n)).rejects.toThrow(
      "La ciudad seleccionada no es válida.",
    );
  });

  it("loads the saved game and the shop through the actor", async () => {
    const saved = gameState({ turn: 5n });
    const actor = mockActor({
      getGame: vi.fn().mockResolvedValue(saved),
      getShop: vi.fn().mockResolvedValue([shopItem()]),
    });
    await expect(loadGame(actor)).resolves.toBe(saved);
    await expect(loadShop(actor)).resolves.toEqual([shopItem()]);
  });

  it("translates a purchase rejection into a Spanish message", async () => {
    const actor = mockActor({
      purchase: vi.fn().mockResolvedValue({
        __kind__: "err",
        err: { __kind__: "insufficientFunds" },
      }),
    });
    await expect(buyItem(actor, "filtro")).rejects.toThrow(
      "No tienes dinero suficiente para esta compra.",
    );
  });

  it("sends planned actions to endTurn as bigint times", async () => {
    const actor = mockActor();
    await resolveTurn(actor, [{ toolId: "filtro", times: 2 }]);
    expect(actor.endTurn).toHaveBeenCalledWith([
      { toolId: "filtro", times: 2n },
    ]);
  });

  it("translates a turn rejection into a Spanish message", async () => {
    const actor = mockActor({
      endTurn: vi.fn().mockResolvedValue({
        __kind__: "err",
        err: { __kind__: "noActionsLeft" },
      }),
    });
    await expect(resolveTurn(actor, [])).rejects.toThrow(
      "No te quedan acciones en este turno.",
    );
  });

  it("requests the ranking with the app's limit", async () => {
    const actor = mockActor();
    await loadRanking(actor);
    expect(actor.getRanking).toHaveBeenCalledWith(RANKING_LIMIT);
  });

  it("clears the saved game through the actor", async () => {
    const actor = mockActor();
    await clearGame(actor);
    expect(actor.resetGame).toHaveBeenCalledTimes(1);
  });

  it("reports a friendly error when the actor is not ready", async () => {
    await expect(loadGame(null)).rejects.toThrow(
      "El servidor del juego aún no está listo. Espera un momento.",
    );
  });
});
