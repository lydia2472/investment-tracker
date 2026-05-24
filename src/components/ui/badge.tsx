import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-profit)] text-white shadow hover:bg-[var(--color-profit)]/80",
        secondary:
          "border-transparent bg-[var(--color-bells)] text-white shadow hover:bg-[var(--color-bells)]/80",
        destructive:
          "border-transparent bg-[var(--color-loss)] text-white shadow hover:bg-[var(--color-loss)]/80",
        profit:
          "border-transparent bg-[var(--color-profit)] text-white shadow hover:bg-[var(--color-profit)]/80",
        bells:
          "border-transparent bg-[var(--color-bells)] text-white shadow hover:bg-[var(--color-bells)]/80",
        loss:
          "border-transparent bg-[var(--color-loss)] text-white shadow hover:bg-[var(--color-loss)]/80",
        leaf:
          "border-transparent bg-[var(--color-leaf)] text-white shadow hover:bg-[var(--color-leaf)]/80",
        shell:
          "border-transparent bg-[var(--color-shell)] text-white shadow hover:bg-[var(--color-shell)]/80",
        outline: "text-foreground border-[var(--color-profit)]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
