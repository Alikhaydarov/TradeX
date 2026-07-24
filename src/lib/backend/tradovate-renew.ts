import { tradovateRequest } from "./tradovate";

export type TradovateRenewalResponse = {
  accessToken?: string;
  expirationTime?: string;
  errorText?: string;
};

export async function renewTradovateAccessToken(accessToken: string) {
  const response = await tradovateRequest<TradovateRenewalResponse>(
    accessToken,
    "/auth/renewAccessToken",
    { method: "GET" },
  );

  if (response.errorText || !response.accessToken) {
    throw new Error(response.errorText || "Tradovate access token could not be renewed.");
  }

  return response;
}
