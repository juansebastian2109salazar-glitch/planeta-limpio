import Map "mo:core/Map";
import Principal "mo:core/Principal";

import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Expose "mo:caffeineai-oql/Expose";
import OQL "mo:caffeineai-oql";
import Entity "mo:caffeineai-oql/Entity";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import FloatValue "mo:caffeineai-oql/FloatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";

import GameTypes "types/game";
import GameApi "mixins/game-api";
import RankingApi "mixins/ranking-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;

  /// Persisted game state, one entry per authenticated player.
  let games : Map.Map<Principal, GameTypes.GameState>;

  include MixinAuthorization(accessControlState, null);
  include GameApi(games);
  include RankingApi(games);

  // The `games` map is keyed by Principal, so the key is promoted to a `player`
  // column via manual mode over `games.entries()`. `GameState` carries nested
  // records, arrays and a variant, so every column is projected explicitly.
  include Expose({
    entities = [
      OQL.Entity.manual<(Principal, GameTypes.GameState)>(
        "game",
        func () = games.entries(),
        "GameState",
        "player",
      )
        .sample((
          Principal.fromText("aaaaa-aa"),
          {
            city = {
              name = "";
              country = "";
              region = "";
              latitude = 0.0;
              longitude = 0.0;
            };
            pollution = 0;
            initialPollution = 0;
            money = 0;
            turn = 0;
            actionsLeft = 0;
            tools = [];
            npcs = [];
            totalRemoved = 0;
            status = #playing;
            updatedAt = 0;
          },
        ))
        .payload("player", func ((player, _)) = player)
        .payload("cityName", func ((_, state)) = state.city.name)
        .payload("cityCountry", func ((_, state)) = state.city.country)
        .payload("cityRegion", func ((_, state)) = state.city.region)
        .payload("latitude", func ((_, state)) = state.city.latitude)
        .payload("longitude", func ((_, state)) = state.city.longitude)
        .payload("pollution", func ((_, state)) = state.pollution)
        .payload("initialPollution", func ((_, state)) = state.initialPollution)
        .payload("money", func ((_, state)) = state.money)
        .payload("turn", func ((_, state)) = state.turn)
        .payload("actionsLeft", func ((_, state)) = state.actionsLeft)
        .payload("toolCount", func ((_, state)) = state.tools.size())
        .payload("npcCount", func ((_, state)) = state.npcs.size())
        .payload("totalRemoved", func ((_, state)) = state.totalRemoved)
        .payload(
          "status",
          func ((_, state)) {
            switch (state.status) {
              case (#playing) { "playing" };
              case (#won) { "won" };
              case (#lost) { "lost" };
            };
          },
        )
        .payload("updatedAt", func ((_, state)) = state.updatedAt)
        .controllerOnly()
        .build(),
    ];
  });

  include ApiDocMixin();
};
