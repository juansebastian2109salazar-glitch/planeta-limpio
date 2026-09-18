import { GameStatus, ShopItemKind } from "@/backend";
import type { GameState } from "@/backend";
import {
  ACTIONS_PER_TURN,
  createLocalGame,
  localPurchase,
  localResolveTurn,
  localShopItems,
} from "@/lib/local-game";
import { describe, expect, it } from "vitest";

const CITY = {
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
};

function newGame(initialPollution = 100n, startingMoney = 120n): GameState {
  return createLocalGame(CITY, initialPollution, startingMoney);
}

describe("local game engine", () => {
  it("starts a fresh game with the full action budget and no upgrades", () => {
    const game = newGame();
    expect(game.status).toBe(GameStatus.playing);
    expect(game.pollution).toBe(100n);
    expect(game.initialPollution).toBe(100n);
    expect(game.money).toBe(120n);
    expect(game.turn).toBe(1n);
    expect(game.actionsLeft).toBe(ACTIONS_PER_TURN);
    expect(game.tools).toEqual([]);
    expect(game.npcs).toEqual([]);
    expect(game.totalRemoved).toBe(0n);
  });

  it("prices tool upgrades and NPCs with escalating costs", () => {
    const game = newGame();
    const first = localShopItems(game);
    const filtro = first.find((item) => item.id === "filtro");
    expect(filtro).toBeDefined();
    expect(filtro?.kind).toBe(ShopItemKind.tool);
    expect(filtro?.price).toBe(40n);
    expect(filtro?.owned).toBe(0n);

    const afterBuy = localPurchase(game, "filtro");
    const second = localShopItems(afterBuy);
    expect(second.find((item) => item.id === "filtro")?.price).toBe(80n);
    expect(second.find((item) => item.id === "filtro")?.owned).toBe(1n);
  });

  it("rejects a purchase the player cannot afford", () => {
    const game = newGame(100n, 10n);
    expect(() => localPurchase(game, "filtro")).toThrow(
      "No tienes dinero suficiente para esta compra.",
    );
  });

  it("rejects an unknown shop item", () => {
    const game = newGame();
    expect(() => localPurchase(game, "no-existe")).toThrow(
      "Ese artículo ya no está disponible en la tienda.",
    );
  });

  it("reduces pollution and earns money when a turn is closed", () => {
    const game = localPurchase(newGame(100n, 120n), "filtro");
    expect(game.money).toBe(80n);

    const result = localResolveTurn(game, [{ toolId: "filtro", times: 2 }]);
    // Filtro level 1 removes 4 per action, two actions = 8 removed.
    expect(result.pollutionRemoved).toBe(8n);
    expect(result.state.pollution).toBe(92n);
    // 8 removed * 2 money per unit = 16 earned.
    expect(result.moneyEarned).toBe(16n);
    expect(result.state.money).toBe(96n);
    expect(result.state.totalRemoved).toBe(8n);
    expect(result.state.turn).toBe(2n);
    expect(result.state.actionsLeft).toBe(ACTIONS_PER_TURN);
  });

  it("refuses to spend more actions than the turn allows", () => {
    const game = localPurchase(newGame(100n, 120n), "filtro");
    expect(() =>
      localResolveTurn(game, [{ toolId: "filtro", times: 4 }]),
    ).toThrow("No te quedan acciones en este turno.");
  });

  it("refuses an unknown tool", () => {
    const game = newGame();
    expect(() =>
      localResolveTurn(game, [{ toolId: "nope", times: 1 }]),
    ).toThrow("Esa herramienta no está disponible.");
  });

  it("lets NPCs clean automatically at the end of a turn without spending actions", () => {
    // Buy a tool and an NPC, then close a turn with no player actions queued.
    let game = localPurchase(newGame(100n, 500n), "filtro");
    game = localPurchase(game, "voluntarios");
    expect(game.npcs).toEqual([{ id: "voluntarios", count: 1n }]);

    const result = localResolveTurn(game, []);
    // Voluntarios remove 3 per turn, no actions consumed.
    expect(result.pollutionRemoved).toBe(3n);
    expect(result.state.pollution).toBe(97n);
    expect(result.state.actionsLeft).toBe(ACTIONS_PER_TURN);
    // NPC money share is 1 per unit removed.
    expect(result.moneyEarned).toBe(3n);
  });

  it("wins the game when pollution reaches zero", () => {
    const game = localPurchase(newGame(4n, 120n), "filtro");
    const result = localResolveTurn(game, [{ toolId: "filtro", times: 1 }]);
    expect(result.state.pollution).toBe(0n);
    expect(result.state.status).toBe(GameStatus.won);
  });

  it("reports the player and NPC contributions in the turn events", () => {
    let game = localPurchase(newGame(100n, 500n), "filtro");
    game = localPurchase(game, "voluntarios");
    const result = localResolveTurn(game, [{ toolId: "filtro", times: 1 }]);
    const kinds = result.events.map((event) => event.kind);
    expect(kinds).toContain("player");
    expect(kinds).toContain("npc");
    expect(kinds).toContain("money");
  });
});
