import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

import Types "../types/ranking";

module {
  /// Build a ranking entry from a player's persisted game summary.
  public func entry(player : Types.PlayerId, cityName : Text, totalRemoved : Nat, turn : Nat) : Types.RankingEntry {
    { player; cityName; totalRemoved; turn };
  };

  /// Order entries by `totalRemoved` descending, breaking ties by `turn`
  /// ascending, and truncate to `limit`.
  public func top(entries : [Types.RankingEntry], limit : Nat) : [Types.RankingEntry] {
    let sorted = entries.sort(
      func (a, b) {
        if (a.totalRemoved > b.totalRemoved) {
          #less;
        } else if (a.totalRemoved < b.totalRemoved) {
          #greater;
        } else {
          Nat.compare(a.turn, b.turn);
        };
      }
    );
    if (sorted.size() <= limit) {
      sorted;
    } else {
      sorted.sliceToArray(0, limit);
    };
  };

  /// 1-based position of `player` within the full ordered list, or `null`.
  public func rankOf(entries : [Types.RankingEntry], player : Types.PlayerId) : ?Nat {
    let sorted = top(entries, entries.size());
    switch (sorted.findIndex(func e = Principal.equal(e.player, player))) {
      case (?index) { ?(index + 1) };
      case null { null };
    };
  };
};
