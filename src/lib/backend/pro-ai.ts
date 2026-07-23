import type { ApiAuth } from "./auth";
import { getPremiumStatus } from "./premium";

export async function requireProAi(auth: ApiAuth) {
  const status = await getPremiumStatus(auth);

  if (!status.isPremium || status.plan !== "pro") {
    return Response.json(
      {
        error: "AI Coach is available on the Pro plan only.",
        code: "PRO_AI_REQUIRED",
        upgradeUrl: "/pricing",
      },
      { status: 403 },
    );
  }

  return null;
}
