import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalendarRouteContent } from "@/components/routes/workspace-route-content";

type CalendarMonthPageProps = {
  params: Promise<{ year: string; month: string }>;
};

function validDatePart(value: string, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

export async function generateMetadata({
  params,
}: CalendarMonthPageProps): Promise<Metadata> {
  const { year, month } = await params;
  return { title: `${year}-${month.padStart(2, "0")} Calendar | Tradox` };
}

export default async function CalendarMonthPage({
  params,
}: CalendarMonthPageProps) {
  const { year, month } = await params;
  if (!validDatePart(year, 2000, 2100) || !validDatePart(month, 1, 12)) {
    notFound();
  }
  return <CalendarRouteContent />;
}
