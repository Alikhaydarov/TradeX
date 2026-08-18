import type { Metadata } from "next";

import { CalendarRouteContent } from "@/components/routes/workspace-route-content";

type EconomicCalendarMonthPageProps = {
  params: Promise<{ year: string; month: string }>;
};

export async function generateMetadata({
  params,
}: EconomicCalendarMonthPageProps): Promise<Metadata> {
  const { year, month } = await params;
  return {
    title: `Economic Calendar ${year}/${month} | TradeWay`,
  };
}

export default function EconomicCalendarMonthPage() {
  return <CalendarRouteContent />;
}
