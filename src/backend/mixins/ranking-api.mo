import Map "mo:core/Map";
import Principal "mo:core/Principal";

import RankingLib "../lib/ranking";
import Types "../types/game";
import RankingTypes "../types/ranking";

mixin (
  games : Map.Map<Principal, Types.GameState>,
) {
  /// Global leaderboard ordered by total pollution removed, including the
  /// caller's own rank when they have a saved game.
  public query ({ caller }) func getRanking(limit : Nat) : async RankingTypes.RankingView {
    let all = games.entries().map(
      func ((player, state)) = RankingLib.entry(player, state.city.name, state.totalRemoved, state.turn)
    ).toArray();

    let entries = RankingLib.top(all, limit);
    let callerRank = RankingLib.rankOf(all, caller);
    let callerEntry = switch (games.get(caller)) {
      case (?state) { ?RankingLib.entry(caller, state.city.name, state.totalRemoved, state.turn) };
      case null { null };
    };

    { entries; callerRank; callerEntry };
  };
};
