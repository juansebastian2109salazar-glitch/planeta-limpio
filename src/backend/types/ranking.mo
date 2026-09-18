import Common "common";

module {
  public type PlayerId = Common.PlayerId;

  /// One row of the global leaderboard, ordered by `totalRemoved` descending.
  public type RankingEntry = {
    player : PlayerId;
    cityName : Text;
    totalRemoved : Nat;
    turn : Nat;
  };

  /// The leaderboard plus the caller's own position, when the caller has a
  /// persisted game. `rank` is 1-based; `null` when the caller is unranked.
  public type RankingView = {
    entries : [RankingEntry];
    callerRank : ?Nat;
    callerEntry : ?RankingEntry;
  };
};
