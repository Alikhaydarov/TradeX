export function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL ?? "",
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  };
}

export function isSupabaseConfigured() {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
}
