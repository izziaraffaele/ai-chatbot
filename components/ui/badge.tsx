import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // H-FARM badge style - refined, professional
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        success:
          "border-transparent bg-success text-success-foreground shadow-sm",
        outline: 
          "border-border text-foreground bg-transparent",
        // H-FARM specific - navy outline badge
        "hfarm-navy":
          "border-primary/30 text-primary bg-primary/5",
        // H-FARM specific - label style (uppercase)
        "hfarm-label":
          "border-border text-muted-foreground bg-muted/50 uppercase tracking-wider text-[10px] font-semibold",
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
