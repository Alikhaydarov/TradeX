import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full min-w-0 rounded-xl border border-[#303030] bg-[#121212] px-3.5 py-3 text-base text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] transition outline-none placeholder:text-zinc-600 hover:border-[#3a3a3a] focus-visible:border-zinc-500 focus-visible:bg-[#151515] focus-visible:ring-2 focus-visible:ring-white/8 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
