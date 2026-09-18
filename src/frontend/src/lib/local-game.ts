import { GameStatus, ShopItemKind } from "@/backend";
import type { GameState, ShopItem, TurnEvent, TurnResult } from "@/backend";
import type { PlannedAction } from "@/lib/game-types";

/**
 * Local game engine for anonymous players.
 *
 * Mirrors the backend rules in `src/backend/lib/game.mo` so a player without a
 * session can run a full game — start, clean, close turns, buy upgrades and
 * reach the finale — entirely in the browser. Nothing here is persisted or sent
 * to the server, so anonymous progress never reaches the ranking.
 */

/** Number of cleaning actions the player gets at the start of every turn. */
export const ACTIONS_PER_TURN = 3n;

/** Money earned per unit of pollution removed by the player's own actions. */
const MONEY_PER_POLLUTION = 2n;

/** Money earned per unit of pollution removed by NPCs (a smaller share). */
const NPC_MONEY_PER_POLLUTION = 1n;

interface ToolDef {
  id: string;
  name: string;
  description: string;
  basePrice: bigint;
  basePower: bigint;
}

interface NpcDef {
  id: string;
  name: string;
  description: string;
  basePrice: bigint;
  power: bigint;
}

/** Tool catalogue, matching the backend's ids, names, prices and powers. */
const TOOLS: ToolDef[] = [
  {
    id: "filtro",
    name: "Filtro de aire",
    description: "Captura partículas en suspensión en el aire de la ciudad.",
    basePrice: 40n,
    basePower: 4n,
  },
  {
    id: "arboles",
    name: "Plantación de árboles",
    description: "Los árboles absorben CO₂ y limpian el aire a largo plazo.",
    basePrice: 90n,
    basePower: 9n,
  },
  {
    id: "regulacion",
    name: "Regulación de emisiones",
    description: "Normas que obligan a las fábricas a reducir sus emisiones.",
    basePrice: 180n,
    basePower: 18n,
  },
];

/** NPC catalogue, matching the backend's ids, names, prices and powers. */
const NPCS: NpcDef[] = [
  {
    id: "voluntarios",
    name: "Voluntarios vecinales",
    description: "Vecinos que limpian la ciudad al final de cada turno.",
    basePrice: 120n,
    power: 3n,
  },
  {
    id: "cuadrilla",
    name: "Cuadrilla municipal",
    description: "Equipo profesional de limpieza que actúa cada turno.",
    basePrice: 300n,
    power: 8n,
  },
];

function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((def) => def.id === id);
}

function findNpc(id: string): NpcDef | undefined {
  return NPCS.find((def) => def.id === id);
}

function levelOf(tools: GameState["tools"], id: string): bigint {
  return tools.find((tool) => tool.id === id)?.level ?? 0n;
}

function countOf(npcs: GameState["npcs"], id: string): bigint {
  return npcs.find((npc) => npc.id === id)?.count ?? 0n;
}

/** Price of the next tool level: base price grows with each level owned. */
function toolPrice(def: ToolDef, level: bigint): bigint {
  return def.basePrice * (level + 1n);
}

/** Price of the next NPC unit: base price grows with each unit owned. */
function npcPrice(def: NpcDef, count: bigint): bigint {
  return def.basePrice * (count + 1n);
}

/** Pollution removed by a tool at the given level (0 = not owned). */
function toolPower(def: ToolDef, level: bigint): bigint {
  return def.basePower * level;
}

/** Build the initial local game state for a freshly chosen city. */
export function createLocalGame(
  city: GameState["city"],
  initialPollution: bigint,
  startingMoney: bigint,
): GameState {
  return {
    status: GameStatus.playing,
    money: startingMoney,
    tools: [],
    initialPollution,
    city,
    npcs: [],
    turn: 1n,
    pollution: initialPollution,
    updatedAt: BigInt(Date.now()) * 1_000_000n,
    totalRemoved: 0n,
    actionsLeft: ACTIONS_PER_TURN,
  };
}

/** Return the local shop catalogue priced for the given player state. */
export function localShopItems(state: GameState): ShopItem[] {
  const toolItems: ShopItem[] = TOOLS.map((def) => {
    const owned = levelOf(state.tools, def.id);
    return {
      id: def.id,
      kind: ShopItemKind.tool,
      name: def.name,
      description: def.description,
      price: toolPrice(def, owned),
      power: def.basePower,
      owned,
    };
  });
  const npcItems: ShopItem[] = NPCS.map((def) => {
    const owned = countOf(state.npcs, def.id);
    return {
      id: def.id,
      kind: ShopItemKind.npc,
      name: def.name,
      description: def.description,
      price: npcPrice(def, owned),
      power: def.power,
      owned,
    };
  });
  return [...toolItems, ...npcItems];
}

/** True when the player can afford at least one item in the local shop. */
function canAffordAny(state: GameState): boolean {
  return localShopItems(state).some((item) => item.price <= state.money);
}

/** Apply a local purchase, validating funds and escalating upgrade costs. */
export function localPurchase(state: GameState, itemId: string): GameState {
  if (state.status !== GameStatus.playing) {
    throw new Error("La partida ha terminado. Reinicia para volver a jugar.");
  }

  const tool = findTool(itemId);
  if (tool) {
    const level = levelOf(state.tools, itemId);
    const price = toolPrice(tool, level);
    if (state.money < price) {
      throw new Error("No tienes dinero suficiente para esta compra.");
    }
    const tools =
      level === 0n
        ? [...state.tools, { id: itemId, level: 1n }]
        : state.tools.map((entry) =>
            entry.id === itemId
              ? { id: entry.id, level: entry.level + 1n }
              : entry,
          );
    return {
      ...state,
      money: state.money - price,
      tools,
      updatedAt: BigInt(Date.now()) * 1_000_000n,
    };
  }

  const npc = findNpc(itemId);
  if (npc) {
    const count = countOf(state.npcs, itemId);
    const price = npcPrice(npc, count);
    if (state.money < price) {
      throw new Error("No tienes dinero suficiente para esta compra.");
    }
    const npcs =
      count === 0n
        ? [...state.npcs, { id: itemId, count: 1n }]
        : state.npcs.map((entry) =>
            entry.id === itemId
              ? { id: entry.id, count: entry.count + 1n }
              : entry,
          );
    return {
      ...state,
      money: state.money - price,
      npcs,
      updatedAt: BigInt(Date.now()) * 1_000_000n,
    };
  }

  throw new Error("Ese artículo ya no está disponible en la tienda.");
}

/**
 * Resolve one local turn: apply the player's cleaning actions, award money for
 * the pollution removed, run NPC automatic cleaning, advance the turn and
 * evaluate victory (pollution 0) or defeat (no money, nothing affordable and no
 * actions left).
 */
export function localResolveTurn(
  state: GameState,
  actions: PlannedAction[],
): TurnResult {
  if (state.status !== GameStatus.playing) {
    throw new Error("La partida ha terminado. Reinicia para volver a jugar.");
  }

  for (const action of actions) {
    if (!findTool(action.toolId)) {
      throw new Error("Esa herramienta no está disponible.");
    }
  }

  const totalTimes = actions.reduce(
    (sum, action) => sum + BigInt(action.times),
    0n,
  );
  if (totalTimes > state.actionsLeft) {
    throw new Error("No te quedan acciones en este turno.");
  }

  // Each cleaning action consumes one of the turn's available actions.
  const actionsLeft = state.actionsLeft - totalTimes;

  // Player actions remove pollution, bounded by what is left.
  let pollution = state.pollution;
  let playerRemoved = 0n;
  for (const action of actions) {
    const def = findTool(action.toolId);
    if (!def) continue;
    const power = toolPower(def, levelOf(state.tools, action.toolId));
    for (let i = 0; i < action.times && pollution > 0n; i += 1) {
      const removed = power < pollution ? power : pollution;
      pollution -= removed;
      playerRemoved += removed;
    }
  }

  // NPCs clean automatically at the end of the turn, without spending actions.
  let npcRemoved = 0n;
  for (const npc of state.npcs) {
    const def = findNpc(npc.id);
    if (!def) continue;
    for (let i = 0n; i < npc.count && pollution > 0n; i += 1n) {
      const removed = def.power < pollution ? def.power : pollution;
      pollution -= removed;
      npcRemoved += removed;
    }
  }

  const pollutionRemoved = playerRemoved + npcRemoved;
  const moneyEarned =
    playerRemoved * MONEY_PER_POLLUTION + npcRemoved * NPC_MONEY_PER_POLLUTION;
  const totalRemoved = state.totalRemoved + pollutionRemoved;
  const money = state.money + moneyEarned;

  const events: TurnEvent[] = [
    {
      kind: "player",
      message: `Tus acciones limpiaron ${playerRemoved} puntos de contaminación.`,
      amount: playerRemoved,
    },
    {
      kind: "npc",
      message: `Tus ayudantes limpiaron ${npcRemoved} puntos de contaminación.`,
      amount: npcRemoved,
    },
    {
      kind: "money",
      message: `Ganaste ${moneyEarned} monedas limpiando el planeta.`,
      amount: moneyEarned,
    },
  ];

  const status: GameStatus =
    pollution === 0n
      ? GameStatus.won
      : money === 0n && actionsLeft === 0n && !canAffordAny({ ...state, money })
        ? GameStatus.lost
        : GameStatus.playing;

  // A continuing game starts the next turn with a fresh action budget; a lost
  // game keeps the exhausted budget so the defeat state is visible.
  const newActionsLeft = status === GameStatus.lost ? 0n : ACTIONS_PER_TURN;

  const newState: GameState = {
    ...state,
    pollution,
    money,
    turn: state.turn + 1n,
    actionsLeft: newActionsLeft,
    totalRemoved,
    status,
    updatedAt: BigInt(Date.now()) * 1_000_000n,
  };

  return {
    state: newState,
    events,
    moneyEarned,
    pollutionRemoved,
  };
}
