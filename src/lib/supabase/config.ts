const productionUrl = "https://qhgidvkzquduoqvjmyod.supabase.co";
const productionPublishableKey =
  "sb_publishable_LgmIwqdOOYDxnchlspVlYQ_nbCGDos8";

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || productionUrl,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      productionPublishableKey,
  };
}

export function isSupabaseConfigured() {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
}
