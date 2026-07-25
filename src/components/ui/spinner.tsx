import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 shrink-0 rounded-full border-2 border-current border-t-transparent text-current",
        className,
      )}
      {...props}
    />
  )
}

export { Spinner }
