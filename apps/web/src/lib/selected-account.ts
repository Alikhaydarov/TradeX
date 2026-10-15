import { cookies } from "next/headers";

export async function getSelectedAccountId() {
  const value = (await cookies()).get("tradoxy_account")?.value;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}
