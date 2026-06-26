import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { requirePremium } from "@/lib/backend/premium";

export const runtime = "nodejs";

async function handleTradeReport(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    const locked = await requirePremium(auth);
    if (locked) return locked;

    return Response.json({
      report: {
        title: "AI Trade Report",
        summary: "Sizning trade tarixingiz AI tahlilga tayyor.",
        mistakes: [],
        riskWarnings: [],
        nextSteps: [
          "Risk foizingizni doimiy saqlang.",
          "Har trade uchun setup nomini yozing.",
          "Daily loss limitga yaqinlashganda tradingni to'xtating.",
        ],
      },
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}

export async function GET(request: Request) {
  return handleTradeReport(request);
}

export async function POST(request: Request) {
  return handleTradeReport(request);
}
