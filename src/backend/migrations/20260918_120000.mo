import Map "mo:core/Map";
import Principal "mo:core/Principal";

import AccessControl "mo:caffeineai-authorization/access-control";

module {
  type OldActor = {};

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    games : Map.Map<Principal, GameState>;
  };

  // Inlined game state shape (migrations must be self-contained).
  type City = {
    name : Text;
    country : Text;
    region : Text;
    latitude : Float;
    longitude : Float;
  };

  type ToolUpgrade = {
    id : Text;
    level : Nat;
  };

  type Npc = {
    id : Text;
    count : Nat;
  };

  type GameStatus = {
    #playing;
    #won;
    #lost;
  };

  type GameState = {
    city : City;
    pollution : Nat;
    initialPollution : Nat;
    money : Nat;
    turn : Nat;
    actionsLeft : Nat;
    tools : [ToolUpgrade];
    npcs : [Npc];
    totalRemoved : Nat;
    status : GameStatus;
    updatedAt : Int;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      games = Map.empty();
    };
  };
};
