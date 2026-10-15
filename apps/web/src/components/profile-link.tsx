"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { profileOptions } from "@/lib/social-data";

export function ProfileLink({
  username,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { username: string }) {
  const client = useQueryClient();
  const warm = () => {
    void client.prefetchQuery(profileOptions(username));
  };
  return (
    <Link
      {...props}
      href={`/u/${encodeURIComponent(username)}`}
      onPointerEnter={warm}
      onFocus={warm}
      onPointerDown={warm}
    >
      {children}
    </Link>
  );
}
