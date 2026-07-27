"use client";

import type { ComponentProps } from "react";

import { FeedV3 as LegacyFeed } from "../feed-v3";

export type FeedPageProps = ComponentProps<typeof LegacyFeed>;

export function FeedPage(props: FeedPageProps) {
  return <LegacyFeed {...props} />;
}
