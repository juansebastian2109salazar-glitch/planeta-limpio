import type {
  City,
  GameState,
  NewGameError,
  RankingView,
  ShopItem,
  TurnResult,
} from "@/backend";
import type { PlannedAction } from "@/lib/game-types";

/** Starting money granted to a brand-new game. */
export const STARTING_MONEY = 120n;

/** Number of ranking rows requested from the backend. */
export const RANKING_LIMIT = 25n;

/** Error thrown when the backend rejects an operation. */
export class BackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendError";
  }
}

/** The subset of the generated actor this app depends on. */
export interface GameActor {
  newGame(
    city: City,
    initialPollution: bigint,
    startingMoney: bigint,
  ): Promise<
    { __kind__: "ok"; ok: GameState } | { __kind__: "err"; err: NewGameError }
  >;
  getGame(): Promise<GameState | null>;
  getShop(): Promise<ShopItem[]>;
  purchase(
    itemId: string,
  ): Promise<
    | { __kind__: "ok"; ok: GameState }
    | { __kind__: "err"; err: { __kind__: string } }
  >;
  endTurn(
    actions: Array<{ toolId: string; times: bigint }>,
  ): Promise<
    | { __kind__: "ok"; ok: TurnResult }
    | { __kind__: "err"; err: { __kind__: string } }
  >;
  resetGame(): Promise<void>;
  getRanking(limit: bigint): Promise<RankingView>;
}

function requireActor(actor: GameActor | null): GameActor {
  if (!actor) {
    throw new BackendError(
      "El servidor del juego aún no está listo. Espera un momento.",
    );
  }
  return actor;
}

function describeError(kind: string): string {
  switch (kind) {
    case "insufficientFunds":
      return "No tienes dinero suficiente para esta compra.";
    case "unknownItem":
      return "Ese artículo ya no está disponible en la tienda.";
    case "gameOver":
      return "La partida ha terminado. Reinicia para volver a jugar.";
    case "noActionsLeft":
      return "No te quedan acciones en este turno.";
    case "noGame":
      return "Todavía no has empezado una partida.";
    case "unknownTool":
      return "Esa herramienta no está disponible.";
    case "invalidCity":
      return "La ciudad seleccionada no es válida.";
    default:
      return "Algo ha salido mal. Inténtalo de nuevo.";
  }
}

/** Start a fresh game for the signed-in player. */
export async function startNewGame(
  actor: GameActor | null,
  city: City,
  initialPollution: bigint,
): Promise<GameState> {
  const result = await requireActor(actor).newGame(
    city,
    initialPollution,
    STARTING_MONEY,
  );
  if (result.__kind__ === "err") {
    throw new BackendError(describeError(result.err));
  }
  return result.ok;
}

/** Load the caller's saved game, or null when none exists. */
export async function loadGame(
  actor: GameActor | null,
): Promise<GameState | null> {
  return requireActor(actor).getGame();
}

/** Load the shop catalogue priced for the caller's current state. */
export async function loadShop(actor: GameActor | null): Promise<ShopItem[]> {
  return requireActor(actor).getShop();
}

/** Buy a tool upgrade or an NPC. */
export async function buyItem(
  actor: GameActor | null,
  itemId: string,
): Promise<GameState> {
  const result = await requireActor(actor).purchase(itemId);
  if (result.__kind__ === "err") {
    throw new BackendError(describeError(result.err.__kind__));
  }
  return result.ok;
}

/** Resolve the current turn with the player's chosen cleaning actions. */
export async function resolveTurn(
  actor: GameActor | null,
  actions: PlannedAction[],
): Promise<TurnResult> {
  const payload = actions.map((action) => ({
    toolId: action.toolId,
    times: BigInt(action.times),
  }));
  const result = await requireActor(actor).endTurn(payload);
  if (result.__kind__ === "err") {
    throw new BackendError(describeError(result.err.__kind__));
  }
  return result.ok;
}

/** Delete the caller's saved game and start over. */
export async function clearGame(actor: GameActor | null): Promise<void> {
  await requireActor(actor).resetGame();
}

/** Load the global leaderboard plus the caller's own position. */
export async function loadRanking(
  actor: GameActor | null,
): Promise<RankingView> {
  return requireActor(actor).getRanking(RANKING_LIMIT);
}
