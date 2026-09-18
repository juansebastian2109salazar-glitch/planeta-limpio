import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";

import GameLib "../lib/game";
import Types "../types/game";

mixin (
  games : Map.Map<Principal, Types.GameState>,
) {
  /// Start a fresh game for the caller with a newly chosen city. Replaces any
  /// existing saved game. Anonymous callers are rejected.
  public shared ({ caller }) func newGame(city : Types.City, initialPollution : Nat, startingMoney : Nat) : async Result.Result<Types.GameState, Types.NewGameError> {
    if (caller.isAnonymous()) {
      return #err(#invalidCity);
    };
    if (city.name.size() == 0) {
      return #err(#invalidCity);
    };
    let state = GameLib.newGame(city, initialPollution, startingMoney);
    games.add(caller, state);
    #ok(state);
  };

  /// Return the caller's saved game, or `null` when none exists.
  public query ({ caller }) func getGame() : async ?Types.GameState {
    games.get(caller);
  };

  /// Return the shop catalogue priced for the caller's current state.
  public query ({ caller }) func getShop() : async [Types.ShopItem] {
    switch (games.get(caller)) {
      case (?state) { GameLib.shopItems(state) };
      case null { [] };
    };
  };

  /// Buy a tool upgrade or an NPC with the caller's money.
  public shared ({ caller }) func purchase(itemId : Text) : async Result.Result<Types.GameState, Types.ShopError> {
    switch (games.get(caller)) {
      case (?state) {
        switch (GameLib.purchase(state, itemId)) {
          case (#ok(updated)) {
            games.add(caller, updated);
            #ok(updated);
          };
          case (#err(e)) { #err(e) };
        };
      };
      case null { #err(#gameOver) };
    };
  };

  /// Resolve the current turn with the caller's chosen cleaning actions.
  public shared ({ caller }) func endTurn(actions : [Types.CleanAction]) : async Result.Result<Types.TurnResult, Types.TurnError> {
    switch (games.get(caller)) {
      case (?state) {
        switch (GameLib.endTurn(state, actions)) {
          case (#ok(result)) {
            games.add(caller, result.state);
            #ok(result);
          };
          case (#err(e)) { #err(e) };
        };
      };
      case null { #err(#noGame) };
    };
  };

  /// Delete the caller's saved game and start over from the city selection.
  public shared ({ caller }) func resetGame() : async () {
    games.remove(caller);
  };
};
