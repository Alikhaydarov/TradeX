"use client";

import type { ComponentProps } from "react";

import { Account as LegacyProfile } from "../account";

export type ProfilePageProps = ComponentProps<typeof LegacyProfile>;

export function ProfilePage(props: ProfilePageProps) {
  return <LegacyProfile {...props} />;
}
