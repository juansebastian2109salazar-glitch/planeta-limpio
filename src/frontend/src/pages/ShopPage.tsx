import { createActor } from "@/backend";
import type { ShopItem } from "@/backend";
import { ShopItemKind } from "@/backend";
import { GameHud } from "@/components/GameHud";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buyItem, loadGame, loadShop } from "@/lib/backend-api";
import type { GameActor } from "@/lib/backend-api";
import { useGameStore } from "@/lib/game-store";
import { formatMoney, formatNumber } from "@/lib/game-types";
import { localPurchase, localShopItems } from "@/lib/local-game";
import { cn } from "@/lib/utils";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Coins,
  Hammer,
  Loader2,
  Lock,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

const SHOP_QUERY_KEY = ["shop"] as const;
const GAME_QUERY_KEY = ["game"] as const;

interface ShopSection {
  kind: ShopItemKind;
  title: string;
  blurb: string;
  icon: typeof Wrench;
  ocid: string;
}

const SECTIONS: ShopSection[] = [
  {
    kind: ShopItemKind.tool,
    title: "Mejoras de herramientas",
    blurb:
      "Las herramientas limpian más rápido: cada nivel aumenta la contaminación que retiras con cada acción.",
    icon: Wrench,
    ocid: "shop.tools_section",
  },
  {
    kind: ShopItemKind.npc,
    title: "Ayudantes",
    blurb:
      "Los ayudantes limpian solos: al final de cada turno retiran una cantidad fija de contaminación sin gastar acciones.",
    icon: Users,
    ocid: "shop.npcs_section",
  },
];

function effectLabel(item: ShopItem): string {
  return item.kind === ShopItemKind.tool
    ? `${formatNumber(item.power)} por acción`
    : `${formatNumber(item.power)} por turno`;
}

function ownedLabel(item: ShopItem): string {
  return item.kind === ShopItemKind.tool
    ? `Nivel ${formatNumber(item.owned)}`
    : `${formatNumber(item.owned)} contratados`;
}

interface ShopCardProps {
  item: ShopItem;
  index: number;
  money: bigint;
  isBuying: boolean;
  onBuy: (item: ShopItem) => void;
}

function ShopCard({ item, index, money, isBuying, onBuy }: ShopCardProps) {
  const affordable = money >= item.price;
  const isTool = item.kind === ShopItemKind.tool;
  const Icon = isTool ? Hammer : Users;

  return (
    <li
      data-ocid={`shop.item.${index + 1}`}
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 shadow-subtle transition-smooth",
        affordable
          ? "border-border hover:border-primary/50 hover:shadow-elevated"
          : "border-border/60 opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isTool ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent",
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {item.name}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {ownedLabel(item)}
          </p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {item.description}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <dt className="hud-label">Efecto</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{effectLabel(item)}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="hud-label">Coste</dt>
          <dd
            className={cn(
              "mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums",
              affordable ? "text-warning" : "text-muted-foreground",
            )}
          >
            <Coins className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{formatMoney(item.price)}</span>
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        data-ocid={`shop.buy_button.${index + 1}`}
        onClick={() => onBuy(item)}
        disabled={!affordable || isBuying}
        className="mt-4 w-full rounded-full"
      >
        {isBuying ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Comprando…
          </>
        ) : affordable ? (
          <>
            <ShoppingBag className="size-4" aria-hidden="true" />
            Comprar
          </>
        ) : (
          <>
            <Lock className="size-4" aria-hidden="true" />
            Sin dinero suficiente
          </>
        )}
      </Button>

      {!affordable ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Te faltan {formatMoney(item.price - money)} para comprarlo.
        </p>
      ) : null}
    </li>
  );
}

function ShopSkeleton() {
  const ids = Array.from({ length: 6 }, (_, i) => `shop-skeleton-${i}`);
  return (
    <div
      data-ocid="shop.loading_state"
      className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {ids.map((id) => (
        <div
          key={id}
          className="rounded-2xl border border-border bg-card p-5 shadow-subtle"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
          <Skeleton className="mt-5 h-9 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Shop screen: buy tool upgrades that clean faster and NPC helpers that clean
 * automatically at the end of every turn.
 */
export function ShopPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();
  const gameActor = actor as GameActor | null;

  const game = useGameStore((state) => state.game);
  const shop = useGameStore((state) => state.shop);
  const setGame = useGameStore((state) => state.setGame);
  const setShop = useGameStore((state) => state.setShop);

  const gameQuery = useQuery({
    queryKey: GAME_QUERY_KEY,
    queryFn: () => loadGame(gameActor),
    enabled: isAuthenticated && !!actor && !isFetching,
  });

  const shopQuery = useQuery({
    queryKey: SHOP_QUERY_KEY,
    queryFn: () => loadShop(gameActor),
    enabled: isAuthenticated && !!actor && !isFetching && !!game,
  });

  // Never let the server response overwrite a locally-created anonymous game.
  useEffect(() => {
    if (isAuthenticated && gameQuery.data !== undefined) {
      setGame(gameQuery.data);
    }
  }, [isAuthenticated, gameQuery.data, setGame]);

  useEffect(() => {
    if (shopQuery.data !== undefined) setShop(shopQuery.data);
  }, [shopQuery.data, setShop]);

  // Anonymous players have no server catalogue, so load the local one.
  useEffect(() => {
    if (!isAuthenticated && game) {
      setShop(localShopItems(game));
    }
  }, [isAuthenticated, game, setShop]);

  const purchase = useMutation({
    mutationFn: (item: ShopItem) => {
      // Anonymous runs buy locally; signed-in runs use the backend.
      if (!isAuthenticated) {
        const current = useGameStore.getState().game;
        if (!current) {
          throw new Error("Todavía no has empezado una partida.");
        }
        return Promise.resolve(localPurchase(current, item.id));
      }
      return buyItem(gameActor, item.id);
    },
    onSuccess: (nextGame, item) => {
      setGame(nextGame);
      void queryClient.invalidateQueries({ queryKey: SHOP_QUERY_KEY });
      toast.success(`Has comprado ${item.name}.`, {
        description:
          item.kind === ShopItemKind.tool
            ? "Ahora limpias más contaminación con cada acción."
            : "Tus ayudantes limpiarán al final de cada turno.",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const money = game?.money ?? 0n;

  const grouped = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        items: shop.filter((item) => item.kind === section.kind),
      })),
    [shop],
  );

  const hasItems = shop.length > 0;
  const isInitialLoading =
    isAuthenticated && !game && (gameQuery.isLoading || gameQuery.isPending);
  const showError = isAuthenticated && (gameQuery.isError || shopQuery.isError);
  const errorMessage =
    (gameQuery.error as Error | null)?.message ??
    (shopQuery.error as Error | null)?.message ??
    "No se pudo cargar la tienda.";

  return (
    <>
      <GameHud game={game} />

      <div
        data-ocid="shop.page"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
      >
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Tienda
              </h1>
              <p className="text-sm text-muted-foreground">
                Invierte lo recaudado limpiando en limpiar aún más rápido.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            data-ocid="shop.back_button"
            className="rounded-full"
          >
            <Link to="/board">
              Volver al tablero
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </header>

        <section
          data-ocid="shop.help_panel"
          className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-subtle sm:grid-cols-2"
        >
          <div className="flex items-start gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Wrench className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Las herramientas limpian más rápido
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Cada nivel que compras aumenta la contaminación que retiras con
                cada acción de limpieza.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"
              aria-hidden="true"
            >
              <Users className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Los ayudantes limpian solos
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Cada ayudante retira una cantidad fija de contaminación al final
                de cada turno, sin gastar tus acciones.
              </p>
            </div>
          </div>
        </section>

        {isInitialLoading ? (
          <ShopSkeleton />
        ) : showError ? (
          <div
            data-ocid="shop.error_state"
            className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-10 text-center"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              No se pudo cargar la tienda
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
            <Button
              type="button"
              data-ocid="shop.retry_button"
              onClick={() => {
                void gameQuery.refetch();
                void shopQuery.refetch();
              }}
              className="mt-5 rounded-full"
            >
              Reintentar
            </Button>
          </div>
        ) : !game ? (
          <div
            data-ocid="shop.empty_state"
            className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"
          >
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              Todavía no tienes una partida
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Empieza una partida para desbloquear la tienda y comprar mejoras
              con el dinero que ganes limpiando.
            </p>
            <Button
              type="button"
              data-ocid="shop.start_button"
              onClick={() => void navigate({ to: "/" })}
              className="mt-5 rounded-full px-6"
            >
              Empezar una partida
            </Button>
          </div>
        ) : !hasItems ? (
          <div
            data-ocid="shop.empty_state"
            className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              La tienda está vacía
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vuelve al tablero y limpia para desbloquear nuevas mejoras.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {grouped.map((section) => {
              const SectionIcon = section.icon;
              return (
                <section key={section.kind} data-ocid={section.ocid}>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        section.kind === ShopItemKind.tool
                          ? "bg-primary/10 text-primary"
                          : "bg-accent/10 text-accent",
                      )}
                      aria-hidden="true"
                    >
                      <SectionIcon className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        {section.title}
                      </h2>
                      <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
                        {section.blurb}
                      </p>
                    </div>
                  </div>

                  {section.items.length === 0 ? (
                    <p
                      data-ocid={`${section.ocid}.empty_state`}
                      className="mt-4 rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      No hay artículos disponibles en esta sección.
                    </p>
                  ) : (
                    <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {section.items.map((item, index) => (
                        <ShopCard
                          key={item.id}
                          item={item}
                          index={index}
                          money={money}
                          isBuying={
                            purchase.isPending &&
                            purchase.variables?.id === item.id
                          }
                          onBuy={(target) => purchase.mutate(target)}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {purchase.isSuccess && purchase.data ? (
          <p
            data-ocid="shop.success_state"
            className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success/10 px-5 py-4 text-sm font-medium text-success"
          >
            <Check className="size-4" aria-hidden="true" />
            Compra realizada. Tu dinero disponible es{" "}
            {formatMoney(purchase.data.money)}.
          </p>
        ) : null}
      </div>
    </>
  );
}
