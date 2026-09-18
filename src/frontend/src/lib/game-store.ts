import type { GameState, ShopItem, TurnEvent } from "@/backend";
import type { AirQuality, LogEntry, PlannedAction } from "@/lib/game-types";
import { create } from "zustand";

let logSequence = 0;

function nextLogId(): string {
  logSequence += 1;
  return `log-${logSequence}`;
}

/** Convert backend turn events into log lines for the shared store. */
export function eventsToLogEntries(
  events: TurnEvent[],
  turn: number,
): LogEntry[] {
  return events.map((event) => ({
    id: nextLogId(),
    turn,
    kind: event.kind,
    message: event.message,
    amount: Number(event.amount),
  }));
}

interface GameStore {
  /** The authoritative game state mirrored from the backend. */
  game: GameState | null;
  /** Shop catalogue for the current game. */
  shop: ShopItem[];
  /** Live air quality for the selected city, when available. */
  airQuality: AirQuality | null;
  /** Cleaning actions queued for the current turn, keyed by tool id. */
  plannedActions: PlannedAction[];
  /** Turn-by-turn event log shown in the action panel. */
  log: LogEntry[];
  /** True while a backend mutation is in flight. */
  isBusy: boolean;
  /** Last user-facing error message, in Spanish. */
  error: string | null;

  setGame: (game: GameState | null) => void;
  setShop: (shop: ShopItem[]) => void;
  setAirQuality: (airQuality: AirQuality | null) => void;
  setBusy: (isBusy: boolean) => void;
  setError: (error: string | null) => void;
  appendLog: (entries: LogEntry[]) => void;
  clearLog: () => void;
  planAction: (toolId: string, times: number) => void;
  clearPlannedActions: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: null,
  shop: [],
  airQuality: null,
  plannedActions: [],
  log: [],
  isBusy: false,
  error: null,

  setGame: (game) => set({ game }),
  setShop: (shop) => set({ shop }),
  setAirQuality: (airQuality) => set({ airQuality }),
  setBusy: (isBusy) => set({ isBusy }),
  setError: (error) => set({ error }),

  appendLog: (entries) =>
    set((state) => ({ log: [...entries, ...state.log].slice(0, 60) })),
  clearLog: () => set({ log: [] }),

  planAction: (toolId, times) =>
    set((state) => {
      const safeTimes = Math.max(0, Math.floor(times));
      const others = state.plannedActions.filter(
        (action) => action.toolId !== toolId,
      );
      if (safeTimes === 0) return { plannedActions: others };
      return { plannedActions: [...others, { toolId, times: safeTimes }] };
    }),

  clearPlannedActions: () => set({ plannedActions: [] }),

  reset: () =>
    set({
      game: null,
      shop: [],
      airQuality: null,
      plannedActions: [],
      log: [],
      isBusy: false,
      error: null,
    }),
}));
