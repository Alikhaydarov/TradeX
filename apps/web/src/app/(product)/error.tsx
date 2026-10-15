"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <section
      className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
      role="alert"
    >
      <h1 className="text-lg font-semibold">This page could not load</h1>
      <p className="text-sm text-neutral-400">
        Your data is safe. Please try again.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button className="ui-button" onClick={reset}>
          <RefreshCw size={16} />
          Try again
        </button>
        <Link href="/home" className="ui-button">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
