import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  isLocale,
  localeCookieName,
  localeFromAcceptLanguage,
} from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(savedLocale)
    ? savedLocale
    : localeFromAcceptLanguage((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
