import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[1rem] border border-white/10 bg-surface-raised px-3.5 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.025)] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-ink-mute hover:border-white/16 hover:bg-surface-raised focus-visible:border-white/20 focus-visible:bg-surface-raised focus-visible:ring-2 focus-visible:ring-white/6 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
