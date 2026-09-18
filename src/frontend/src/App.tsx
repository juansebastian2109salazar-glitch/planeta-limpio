import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { BoardPage } from "@/pages/BoardPage";
import { FinalePage } from "@/pages/FinalePage";
import { HomePage } from "@/pages/HomePage";
import { RankingPage } from "@/pages/RankingPage";
import { ShopPage } from "@/pages/ShopPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/board",
  component: BoardPage,
});

const shopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shop",
  component: ShopPage,
});

const rankingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ranking",
  component: RankingPage,
});

const finaleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finale",
  component: FinalePage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  boardRoute,
  shopRoute,
  rankingRoute,
  finaleRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </>
  );
}
