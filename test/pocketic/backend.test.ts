import { PocketIc } from "@dfinity/pic";
import { Principal } from "@icp-sdk/core/principal";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from. Installing the current wasm onto an empty
// canister there traps IC0503 before any test runs.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

let pic: PocketIc | undefined;
let actor: _SERVICE;

// `newGame` rejects anonymous callers, and PocketIC's default caller is
// anonymous, so every test acts as a signed-in player.
const PLAYER = Principal.fromText("aaaaa-aa");

const CITY = {
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4168,
  longitude: -3.7038,
};

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    ({ actor } = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: BACKEND_WASM,
      sender: PLAYER,
    }));
    actor.setPrincipal(PLAYER);
    return;
  }
  // `[baseline, current]`, the same install contract the hosted deploy uses for
  // a converted project. The upgrade replays the chain from the legacy schema.
  const installed = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BASELINE_WASM });
  await pic.upgradeCanister({
    canisterId: installed.canisterId,
    wasm: BACKEND_WASM,
    arg: new Uint8Array(),
  });
  actor = installed.actor;
  actor.setPrincipal(PLAYER);
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far. A failed
  // `PocketIc.create` otherwise stacks "Cannot read properties of undefined"
  // on top of the real error and buries the one line that explains the run.
  await pic?.tearDown();
});

it("answers an empty-state read instead of trapping", async () => {
  await expect(actor.getGame()).resolves.toEqual([]);
  await expect(actor.getShop()).resolves.toEqual([]);
});

it("starts a game and reads it back through the real canister", async () => {
  const result = await actor.newGame(CITY, 100n, 120n);
  expect(result).toHaveProperty("ok");
  if (!("ok" in result)) throw new Error("newGame returned an error");

  const saved = await actor.getGame();
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    city: { name: "Madrid" },
    pollution: 100n,
    initialPollution: 100n,
    money: 120n,
    turn: 1n,
    actionsLeft: 3n,
  });
});

it("prices the shop and buys a tool upgrade", async () => {
  const shop = await actor.getShop();
  expect(shop.length).toBeGreaterThan(0);
  const filtro = shop.find((item) => item.id === "filtro");
  expect(filtro).toBeDefined();
  expect(filtro?.price).toBe(40n);

  const purchase = await actor.purchase("filtro");
  expect(purchase).toHaveProperty("ok");
  if (!("ok" in purchase)) throw new Error("purchase returned an error");
  expect(purchase.ok.money).toBe(80n);
  expect(purchase.ok.tools).toEqual([{ id: "filtro", level: 1n }]);
});

it("resolves a turn, removing pollution and earning money", async () => {
  const result = await actor.endTurn([{ toolId: "filtro", times: 2n }]);
  expect(result).toHaveProperty("ok");
  if (!("ok" in result)) throw new Error("endTurn returned an error");
  expect(result.ok.pollutionRemoved).toBe(8n);
  expect(result.ok.moneyEarned).toBe(16n);
  expect(result.ok.state.pollution).toBe(92n);
  expect(result.ok.state.money).toBe(96n);
  expect(result.ok.state.turn).toBe(2n);
});

it("rejects an unaffordable purchase with a typed error", async () => {
  const result = await actor.purchase("regulacion");
  expect(result).toHaveProperty("err");
  if (!("err" in result)) throw new Error("purchase unexpectedly succeeded");
  expect(result.err).toHaveProperty("insufficientFunds");
});

it("rejects an unknown tool on endTurn", async () => {
  const result = await actor.endTurn([{ toolId: "no-existe", times: 1n }]);
  expect(result).toHaveProperty("err");
  if (!("err" in result)) throw new Error("endTurn unexpectedly succeeded");
  expect(result.err).toHaveProperty("unknownTool");
});

it("returns a ranking view with the caller's entry", async () => {
  const ranking = await actor.getRanking(25n);
  expect(ranking.entries.length).toBeGreaterThan(0);
  expect(ranking.callerRank).toHaveLength(1);
  expect(ranking.callerEntry).toHaveLength(1);
});

it("clears the saved game on reset", async () => {
  await actor.resetGame();
  await expect(actor.getGame()).resolves.toEqual([]);
});
