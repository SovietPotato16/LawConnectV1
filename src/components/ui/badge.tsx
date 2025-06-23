import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue text-base hover:bg-blue/80",
        secondary:
          "border-transparent bg-surface1 text-text hover:bg-surface2",
        destructive:
          "border-transparent bg-red text-base hover:bg-red/80",
        outline: "text-text border-surface2",
        success: "border-transparent bg-green text-base hover:bg-green/80",
        warning: "border-transparent bg-yellow text-base hover:bg-yellow/80",
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