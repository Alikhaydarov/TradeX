"use client";

import { useEffect } from "react";

import { useAuth } from "../auth-context";
import {
  fetchProfileData,
  hasFreshProfileData,
  profileDataKey,
} from "./profile-data-store";

export function WorkspaceProfilePrefetch() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const key = profileDataKey(user.id);
    if (hasFreshProfileData(key)) return;

    const warm = () => {
      void fetchProfileData({ key }).catch(() => undefined);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleHandle = idleWindow.requestIdleCallback?.(warm, { timeout: 1600 });
    const timeoutHandle =
      idleHandle === undefined ? window.setTimeout(warm, 700) : undefined;

    return () => {
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    };
  }, [user]);

  return null;
}
