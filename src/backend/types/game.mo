import Common "common";

module {
  public type PlayerId = Common.PlayerId;
  public type Timestamp = Common.Timestamp;

  /// The real city the player chose. Air-quality readings are fetched by the
  /// frontend directly from Open-Meteo; the backend only stores the identity
  /// and coordinates so a saved game can be restored.
  public type City = {
    name : Text;
    country : Text;
    region : Text;
    latitude : Float;
    longitude : Float;
  };

  /// A tool upgrade the player owns. `level` starts at 0 (not owned) and each
  /// purchase raises it by one; higher levels remove more pollution per action.
  public type ToolUpgrade = {
    id : Text;
    level : Nat;
  };

  /// An NPC cleaner the player owns. Each owned NPC removes a fixed amount of
  /// pollution automatically at the end of every turn.
  public type Npc = {
    id : Text;
    count : Nat;
  };

  /// Lifecycle of a single-player game.
  public type GameStatus = {
    #playing;
    #won;
    #lost;
  };

  /// A cleaning action the player submits for the current turn.
  public type CleanAction = {
    /// Identifier of the tool used for this action.
    toolId : Text;
    /// How many times the action is performed this turn.
    times : Nat;
  };

  /// The persisted game state for one authenticated player.
  public type GameState = {
    city : City;
    /// Current atmospheric pollution level (same unit as the city's initial
    /// reading, e.g. European AQI).
    pollution : Nat;
    /// Pollution level when the game started, used to compute progress.
    initialPollution : Nat;
    money : Nat;
    turn : Nat;
    /// Remaining cleaning actions for the current turn.
    actionsLeft : Nat;
    tools : [ToolUpgrade];
    npcs : [Npc];
    /// Cumulative pollution removed across the whole game; drives the ranking.
    totalRemoved : Nat;
    status : GameStatus;
    updatedAt : Timestamp;
  };

  /// One entry in the per-turn event log returned by `endTurn`.
  public type TurnEvent = {
    kind : Text;
    message : Text;
    amount : Nat;
  };

  /// Result of resolving a turn: the new state plus what happened.
  public type TurnResult = {
    state : GameState;
    events : [TurnEvent];
    moneyEarned : Nat;
    pollutionRemoved : Nat;
  };

  /// A purchasable item in the shop.
  public type ShopItemKind = {
    #tool;
    #npc;
  };

  /// A shop catalogue entry with its current price for the caller.
  public type ShopItem = {
    id : Text;
    kind : ShopItemKind;
    name : Text;
    description : Text;
    /// Price for the caller's next purchase (scales with owned level/count).
    price : Nat;
    /// Pollution removed per action (tools) or per turn (NPCs).
    power : Nat;
    /// Current owned level (tools) or count (NPCs).
    owned : Nat;
  };

  /// Errors a shop purchase can return to the caller.
  public type ShopError = {
    #unknownItem : Text;
    #insufficientFunds : { required : Nat; available : Nat };
    #gameOver;
  };

  /// Errors a turn resolution can return to the caller.
  public type TurnError = {
    #noGame;
    #gameOver;
    #unknownTool : Text;
    #noActionsLeft;
  };

  /// Errors a new-game request can return to the caller.
  public type NewGameError = {
    #invalidCity;
  };
};
