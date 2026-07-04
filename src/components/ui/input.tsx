import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[1rem] border border-white/8 bg-[#141518] px-3.5 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.03)] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-zinc-500 hover:border-white/14 hover:bg-[#17181b] focus-visible:border-white/18 focus-visible:bg-[#17181b] focus-visible:ring-2 focus-visible:ring-white/6 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
