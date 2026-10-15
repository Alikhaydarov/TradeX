"use client";

import Image from "next/image";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BadgeCheck, Users, X } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { ProductModal } from "./product-modal";
import { DataLoader } from "./data-loader";
import { ProfileLink } from "./profile-link";
import { initials } from "./social-post";

type ConnectionPage = {
  people: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    is_verified: boolean;
  }[];
  nextCursor: string | null;
};

export function ProfileConnections({
  username,
  initialTab,
  onClose,
}: {
  username: string;
  initialTab: "followers" | "following";
  onClose: () => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const query = useInfiniteQuery({
    queryKey: ["connections", username.toLowerCase(), tab],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      clientApi<ConnectionPage>(
        `/api/community/profile/${encodeURIComponent(username)}/connections?type=${tab}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
        { signal },
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
  const people = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.people) ?? []).map((person) => [
        person.id,
        person,
      ]),
    ).values(),
  ];
  return (
    <ProductModal titleId="connections-title" onClose={onClose}>
      <section className="flex max-h-[85dvh] min-h-80 w-full flex-col overflow-hidden rounded-t-lg border border-neutral-800 bg-black text-neutral-100 sm:rounded-lg">
        <header className="flex items-center justify-between gap-3 border-b border-neutral-800 p-4">
          <div className="min-w-0">
            <h2 id="connections-title" className="text-base font-semibold">
              Connections
            </h2>
            <p className="truncate text-sm text-neutral-400">@{username}</p>
          </div>
          <button
            type="button"
            className="icon-button shrink-0"
            aria-label="Close connections"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div
          className="grid grid-cols-2 border-b border-neutral-800"
          aria-label="Connection lists"
        >
          {(["followers", "following"] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={`min-h-12 border-b-2 text-sm font-medium capitalize ${tab === value ? "border-white text-white" : "border-transparent text-neutral-400 hover:bg-neutral-950"}`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {query.isPending ? (
            <DataLoader label={`Loading ${tab}`} />
          ) : (
            <>
              {query.isError && (
                <div className="space-y-3 p-4 text-sm" role="alert">
                  <p>{query.error.message}</p>
                  <button
                    className="ui-button"
                    onClick={() =>
                      void (query.isFetchNextPageError
                        ? query.fetchNextPage()
                        : query.refetch())
                    }
                  >
                    Retry
                  </button>
                </div>
              )}
              {!people.length && !query.isError && (
                <div className="grid min-h-48 place-content-center gap-3 p-6 text-center text-neutral-400">
                  <Users className="mx-auto" size={24} />
                  <p className="text-sm">
                    {tab === "followers"
                      ? "No followers yet"
                      : "Not following anyone yet"}
                  </p>
                </div>
              )}
              <ul className="divide-y divide-neutral-900">
                {people.map((person) => (
                  <li key={person.id}>
                    <ProfileLink
                      username={person.username}
                      onClick={onClose}
                      className="flex min-h-20 items-start gap-3 p-4 transition-colors hover:bg-neutral-950 focus-visible:bg-neutral-900"
                    >
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-900 text-sm">
                        {person.avatar_url?.startsWith("http") ? (
                          <Image
                            src={person.avatar_url}
                            alt=""
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          initials(person.full_name || person.username)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <span className="truncate">
                            {person.full_name || person.username}
                          </span>
                          {person.is_verified && (
                            <BadgeCheck
                              size={15}
                              aria-label="Verified"
                              className="shrink-0 text-sky-400"
                            />
                          )}
                        </span>
                        <span className="block truncate text-sm text-neutral-400">
                          @{person.username}
                        </span>
                        {person.bio && (
                          <span className="mt-1 block line-clamp-2 break-words text-sm text-neutral-300">
                            {person.bio}
                          </span>
                        )}
                      </span>
                    </ProfileLink>
                  </li>
                ))}
              </ul>
              {query.hasNextPage && (
                <div className="p-4">
                  <button
                    type="button"
                    className="ui-button w-full"
                    disabled={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                  >
                    {query.isFetchingNextPage ? (
                      <DataLoader compact label="Loading more people" />
                    ) : (
                      "Show more"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </ProductModal>
  );
}
