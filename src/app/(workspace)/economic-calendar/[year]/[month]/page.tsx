import type { Metadata } from "next";

import { JournalCalendar } from "@/components/journal/journal-calendar";

type EconomicCalendarMonthPageProps = {
  params: Promise<{ year: string; month: string }>;
};

export async function generateMetadata({
  params,
}: EconomicCalendarMonthPageProps): Promise<Metadata> {
  const { year, month } = await params;
  return {
    title: `Economic Calendar ${year}/${month} | Tradoxy`,
  };
}

export default function EconomicCalendarMonthPage() {
  return <JournalCalendar />;
}
