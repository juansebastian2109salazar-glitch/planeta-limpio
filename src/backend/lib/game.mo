import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Time "mo:core/Time";

import Types "../types/game";

module {
  /// Number of cleaning actions the player gets at the start of every turn.
  let actionsPerTurn : Nat = 3;

  /// Money earned per unit of pollution removed by the player's own actions.
  let moneyPerPollution : Nat = 2;

  /// Money earned per unit of pollution removed by NPCs (a smaller share).
  let npcMoneyPerPollution : Nat = 1;

  /// A tool in the catalogue. `basePower` is the pollution removed per action
  /// at level 1; each further level adds `basePower` again.
  type ToolDef = {
    id : Text;
    name : Text;
    description : Text;
    basePrice : Nat;
    basePower : Nat;
  };

  /// An NPC in the catalogue. `power` is the pollution removed automatically
  /// at the end of every turn, per owned unit.
  type NpcDef = {
    id : Text;
    name : Text;
    description : Text;
    basePrice : Nat;
    power : Nat;
  };

  let tools : [ToolDef] = [
    {
      id = "filtro";
      name = "Filtro de aire";
      description = "Captura partículas en suspensión en el aire de la ciudad.";
      basePrice = 40;
      basePower = 4;
    },
    {
      id = "arboles";
      name = "Plantación de árboles";
      description = "Los árboles absorben CO₂ y limpian el aire a largo plazo.";
      basePrice = 90;
      basePower = 9;
    },
    {
      id = "regulacion";
      name = "Regulación de emisiones";
      description = "Normas que obligan a las fábricas a reducir sus emisiones.";
      basePrice = 180;
      basePower = 18;
    },
  ];

  let npcs : [NpcDef] = [
    {
      id = "voluntarios";
      name = "Voluntarios vecinales";
      description = "Vecinos que limpian la ciudad al final de cada turno.";
      basePrice = 120;
      power = 3;
    },
    {
      id = "cuadrilla";
      name = "Cuadrilla municipal";
      description = "Equipo profesional de limpieza que actúa cada turno.";
      basePrice = 300;
      power = 8;
    },
  ];

  /// Price of the next tool level: base price grows with each level owned.
  func toolPrice(def : ToolDef, level : Nat) : Nat {
    def.basePrice * (level + 1);
  };

  /// Price of the next NPC unit: base price grows with each unit owned.
  func npcPrice(def : NpcDef, count : Nat) : Nat {
    def.basePrice * (count + 1);
  };

  /// Pollution removed by a tool at the given level (0 = not owned).
  func toolPower(def : ToolDef, level : Nat) : Nat {
    def.basePower * level;
  };

  func findTool(id : Text) : ?ToolDef {
    tools.find(func def = def.id == id);
  };

  func findNpc(id : Text) : ?NpcDef {
    npcs.find(func def = def.id == id);
  };

  func levelOf(toolList : [Types.ToolUpgrade], id : Text) : Nat {
    switch (toolList.find(func t = t.id == id)) {
      case (?t) { t.level };
      case null { 0 };
    };
  };

  func countOf(npcList : [Types.Npc], id : Text) : Nat {
    switch (npcList.find(func n = n.id == id)) {
      case (?n) { n.count };
      case null { 0 };
    };
  };

  /// Build the initial game state for a freshly chosen city.
  public func newGame(city : Types.City, initialPollution : Nat, startingMoney : Nat) : Types.GameState {
    {
      city;
      pollution = initialPollution;
      initialPollution;
      money = startingMoney;
      turn = 1;
      actionsLeft = actionsPerTurn;
      tools = [];
      npcs = [];
      totalRemoved = 0;
      status = #playing;
      updatedAt = Time.now();
    };
  };

  /// Return the shop catalogue priced for the given player state.
  public func shopItems(state : Types.GameState) : [Types.ShopItem] {
    let toolItems = tools.map(
      func def = {
        id = def.id;
        kind = #tool;
        name = def.name;
        description = def.description;
        price = toolPrice(def, levelOf(state.tools, def.id));
        power = def.basePower;
        owned = levelOf(state.tools, def.id);
      }
    );
    let npcItems = npcs.map(
      func def = {
        id = def.id;
        kind = #npc;
        name = def.name;
        description = def.description;
        price = npcPrice(def, countOf(state.npcs, def.id));
        power = def.power;
        owned = countOf(state.npcs, def.id);
      }
    );
    toolItems.concat(npcItems);
  };

  /// True when the player can afford at least one item in the shop.
  func canAffordAny(state : Types.GameState) : Bool {
    shopItems(state).any(func item = item.price <= state.money);
  };

  /// Apply a purchase to the player's state.
  public func purchase(state : Types.GameState, itemId : Text) : Result.Result<Types.GameState, Types.ShopError> {
    if (state.status != #playing) {
      return #err(#gameOver);
    };

    switch (findTool(itemId)) {
      case (?def) {
        let level = levelOf(state.tools, itemId);
        let price = toolPrice(def, level);
        if (state.money < price) {
          return #err(#insufficientFunds({ required = price; available = state.money }));
        };
        let updatedTools = if (level == 0) {
          state.tools.concat([{ id = itemId; level = 1 }]);
        } else {
          state.tools.map(
            func t = if (t.id == itemId) { { id = t.id; level = t.level + 1 } } else { t }
          );
        };
        #ok({
          state with
          money = state.money - price;
          tools = updatedTools;
          updatedAt = Time.now();
        });
      };
      case null {
        switch (findNpc(itemId)) {
          case (?def) {
            let count = countOf(state.npcs, itemId);
            let price = npcPrice(def, count);
            if (state.money < price) {
              return #err(#insufficientFunds({ required = price; available = state.money }));
            };
            let updatedNpcs = if (count == 0) {
              state.npcs.concat([{ id = itemId; count = 1 }]);
            } else {
              state.npcs.map(
                func n = if (n.id == itemId) { { id = n.id; count = n.count + 1 } } else { n }
              );
            };
            #ok({
              state with
              money = state.money - price;
              npcs = updatedNpcs;
              updatedAt = Time.now();
            });
          };
          case null { #err(#unknownItem(itemId)) };
        };
      };
    };
  };

  /// Resolve one turn: apply the player's cleaning actions, compute money
  /// earned from pollution removed, run NPC automatic cleaning, advance the
  /// turn, and evaluate the end-of-game condition.
  public func endTurn(state : Types.GameState, actions : [Types.CleanAction]) : Result.Result<Types.TurnResult, Types.TurnError> {
    if (state.status != #playing) {
      return #err(#gameOver);
    };

    // Validate every action before mutating anything.
    for (action in actions.values()) {
      if (findTool(action.toolId) == null) {
        return #err(#unknownTool(action.toolId));
      };
    };
    let totalTimes = actions.foldLeft(0, func(acc, action) = acc + action.times);
    if (totalTimes > state.actionsLeft) {
      return #err(#noActionsLeft);
    };

    // Each cleaning action consumes one of the turn's available actions.
    let actionsLeft = state.actionsLeft - totalTimes;

    // Player actions remove pollution, bounded by what is left.
    var pollution = state.pollution;
    var playerRemoved = 0;
    for (action in actions.values()) {
      let def = findTool(action.toolId) ?? return #err(#unknownTool(action.toolId));
      let power = toolPower(def, levelOf(state.tools, action.toolId));
      var i = 0;
      while (i < action.times and pollution > 0) {
        let removed = Nat.min(power, pollution);
        pollution -= removed;
        playerRemoved += removed;
        i += 1;
      };
    };

    // NPCs clean automatically at the end of the turn, without spending actions.
    var npcRemoved = 0;
    for (npc in state.npcs.values()) {
      switch (findNpc(npc.id)) {
        case (?def) {
          var i = 0;
          while (i < npc.count and pollution > 0) {
            let removed = Nat.min(def.power, pollution);
            pollution -= removed;
            npcRemoved += removed;
            i += 1;
          };
        };
        case null {};
      };
    };

    let pollutionRemoved = playerRemoved + npcRemoved;
    let moneyEarned = playerRemoved * moneyPerPollution + npcRemoved * npcMoneyPerPollution;
    let totalRemoved = state.totalRemoved + pollutionRemoved;
    let money = state.money + moneyEarned;

    let events : [Types.TurnEvent] = [
      {
        kind = "player";
        message = "Tus acciones limpiaron " # playerRemoved.toText() # " puntos de contaminación.";
        amount = playerRemoved;
      },
      {
        kind = "npc";
        message = "Tus ayudantes limpiaron " # npcRemoved.toText() # " puntos de contaminación.";
        amount = npcRemoved;
      },
      {
        kind = "money";
        message = "Ganaste " # moneyEarned.toText() # " monedas limpiando el planeta.";
        amount = moneyEarned;
      },
    ];

    // Defeat: the player has spent every action this turn, has no money, and
    // cannot afford any shop item, so no further progress is possible.
    let status : Types.GameStatus = if (pollution == 0) {
      #won;
    } else if (money == 0 and actionsLeft == 0 and not canAffordAny({ state with money })) {
      #lost;
    } else {
      #playing;
    };

    // A continuing game starts the next turn with a fresh action budget; a lost
    // game keeps the exhausted budget so the defeat state is visible.
    let newActionsLeft = switch (status) {
      case (#lost) { 0 };
      case (_) { actionsPerTurn };
    };

    let newState : Types.GameState = {
      state with
      pollution;
      money;
      turn = state.turn + 1;
      actionsLeft = newActionsLeft;
      totalRemoved;
      status;
      updatedAt = Time.now();
    };

    #ok({
      state = newState;
      events;
      moneyEarned;
      pollutionRemoved;
    });
  };
};
