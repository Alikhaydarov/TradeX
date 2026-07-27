export const APP_NAVIGATE_EVENT = "tradox:navigate";

export type AppNavigationOptions = {
  replace?: boolean;
  scroll?: boolean;
};

export function navigateApp(path: string, options: AppNavigationOptions = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(APP_NAVIGATE_EVENT, {
      detail: { path, replace: Boolean(options.replace), scroll: options.scroll !== false },
    }),
  );
}
