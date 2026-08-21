import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full min-w-0 resize-y rounded-lg border border-input bg-surface-raised px-3.5 py-3 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.025)] transition-colors outline-none placeholder:text-ink-mute hover:border-zinc-600 focus-visible:border-zinc-400 focus-visible:bg-surface-raised focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
