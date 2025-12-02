import * as React from "react"
import { cn } from "@/lib/utils"

interface BreezyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "highlight" | "flat"
}

const BreezyCard = React.forwardRef<HTMLDivElement, BreezyCardProps>(
  ({ className, variant = "glass", ...props }, ref) => {
    const variants = {
      default: "bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800",
      glass: "bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg shadow-black/5",
      highlight: "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border-cyan-500/20",
      flat: "bg-transparent border-none shadow-none"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-3xl border overflow-hidden transition-all duration-300",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
BreezyCard.displayName = "BreezyCard"

const BreezyCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 md:p-6", className)}
    {...props}
  />
))
BreezyCardHeader.displayName = "BreezyCardHeader"

const BreezyCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-bold leading-none tracking-tight text-gray-900 dark:text-white/90",
      className
    )}
    {...props}
  />
))
BreezyCardTitle.displayName = "BreezyCardTitle"

const BreezyCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
BreezyCardDescription.displayName = "BreezyCardDescription"

const BreezyCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 md:p-6 pt-0", className)} {...props} />
))
BreezyCardContent.displayName = "BreezyCardContent"

export { BreezyCard, BreezyCardHeader, BreezyCardTitle, BreezyCardDescription, BreezyCardContent }