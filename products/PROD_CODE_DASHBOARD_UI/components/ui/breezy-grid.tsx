import * as React from "react"
import { cn } from "@/lib/utils"

interface BreezyGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4
}

export function BreezyGrid({ className, cols = 1, children, ...props }: BreezyGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  }

  return (
    <div 
      className={cn("grid gap-4 md:gap-6 pb-20 md:pb-6", gridCols[cols], className)} 
      {...props}
    >
      {children}
    </div>
  )
}
