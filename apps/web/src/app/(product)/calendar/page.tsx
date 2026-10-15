import { CalendarOverview } from "@/components/calendar-overview";
import { getJournalData } from "@/lib/journal-data";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [params, { trades, failed }] = await Promise.all([
    searchParams,
    getJournalData(),
  ]);
  const validMonth =
    params.month &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) &&
    Number(params.month.slice(0, 4)) >= 1900;
  const month = validMonth
    ? params.month!
    : new Date().toISOString().slice(0, 7);
  return <CalendarOverview month={month} trades={trades} failed={failed} />;
}
