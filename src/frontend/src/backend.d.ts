import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Cell {
    value: Value;
    name: string;
}
export interface City {
    region: string;
    latitude: number;
    country: string;
    name: string;
    longitude: number;
}
export interface CleanAction {
    times: bigint;
    toolId: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface GameState {
    status: GameStatus;
    money: bigint;
    tools: Array<ToolUpgrade>;
    initialPollution: bigint;
    city: City;
    npcs: Array<Npc>;
    turn: bigint;
    pollution: bigint;
    updatedAt: Timestamp;
    totalRemoved: bigint;
    actionsLeft: bigint;
}
export interface Npc {
    id: string;
    count: bigint;
}
export type PlayerId = Principal;
export interface RankingEntry {
    player: PlayerId;
    turn: bigint;
    cityName: string;
    totalRemoved: bigint;
}
export interface RankingView {
    callerRank?: bigint;
    entries: Array<RankingEntry>;
    callerEntry?: RankingEntry;
}
export type Result = {
    __kind__: "ok";
    ok: GameState;
} | {
    __kind__: "err";
    err: ShopError;
};
export type Result_1 = {
    __kind__: "ok";
    ok: GameState;
} | {
    __kind__: "err";
    err: NewGameError;
};
export type Result_2 = {
    __kind__: "ok";
    ok: TurnResult;
} | {
    __kind__: "err";
    err: TurnError;
};
export type Result_3 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type ShopError = {
    __kind__: "insufficientFunds";
    insufficientFunds: {
        available: bigint;
        required: bigint;
    };
} | {
    __kind__: "unknownItem";
    unknownItem: string;
} | {
    __kind__: "gameOver";
    gameOver: null;
};
export interface ShopItem {
    id: string;
    owned: bigint;
    kind: ShopItemKind;
    name: string;
    description: string;
    power: bigint;
    price: bigint;
}
export type Timestamp = bigint;
export interface ToolUpgrade {
    id: string;
    level: bigint;
}
export type TurnError = {
    __kind__: "noActionsLeft";
    noActionsLeft: null;
} | {
    __kind__: "noGame";
    noGame: null;
} | {
    __kind__: "unknownTool";
    unknownTool: string;
} | {
    __kind__: "gameOver";
    gameOver: null;
};
export interface TurnEvent {
    kind: string;
    message: string;
    amount: bigint;
}
export interface TurnResult {
    pollutionRemoved: bigint;
    state: GameState;
    events: Array<TurnEvent>;
    moneyEarned: bigint;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum GameStatus {
    won = "won",
    lost = "lost",
    playing = "playing"
}
export enum NewGameError {
    invalidCity = "invalidCity"
}
export enum ShopItemKind {
    npc = "npc",
    tool = "tool"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Resolve the current turn with the caller's chosen cleaning actions.
     */
    endTurn(actions: Array<CleanAction>): Promise<Result_2>;
    execute(qJson: string): Promise<Result__1>;
    /**
     * / Static Markdown description of this canister's public API.
     */
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Return the caller's saved game, or `null` when none exists.
     */
    getGame(): Promise<GameState | null>;
    /**
     * / Global leaderboard ordered by total pollution removed, including the
     * / caller's own rank when they have a saved game.
     */
    getRanking(limit: bigint): Promise<RankingView>;
    /**
     * / Return the shop catalogue priced for the caller's current state.
     */
    getShop(): Promise<Array<ShopItem>>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Start a fresh game for the caller with a newly chosen city. Replaces any
     * / existing saved game. Anonymous callers are rejected.
     */
    newGame(city: City, initialPollution: bigint, startingMoney: bigint): Promise<Result_1>;
    /**
     * / Buy a tool upgrade or an NPC with the caller's money.
     */
    purchase(itemId: string): Promise<Result>;
    /**
     * / Delete the caller's saved game and start over from the city selection.
     */
    resetGame(): Promise<void>;
    schema(): Promise<string>;
}
