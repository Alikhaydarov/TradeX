"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-surface p-5 text-center shadow-2xl">
        <h2 className="text-base font-bold text-white">This page could not load</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Your workspace is still available. Try loading this section again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 active:scale-95"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
