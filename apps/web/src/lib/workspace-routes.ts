const tradingRoutes = [
  "/dashboard",
  "/calendar",
  "/trades",
  "/analytics",
  "/risk",
  "/evaluations",
  "/coach",
];

export function isTradingRoute(pathname: string) {
  return tradingRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}
