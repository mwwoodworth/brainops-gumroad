import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface ActionChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon
  label: string
  isActive?: boolean
  variant?: "default" | "primary" | "danger"
}

const ActionChip = React.forwardRef<HTMLButtonElement, ActionChipProps>(
  ({ className, icon: Icon, label, isActive, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border-gray-200/50 dark:border-white/10 text-gray-700 dark:text-gray-300",
      primary: "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-600 dark:text-cyan-300",
      danger: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-300"
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all active:scale-95",
          variants[variant],
          isActive && "ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-slate-900",
          className
        )}
        {...props}
      >
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </button>
    )
  }
)
ActionChip.displayName = "ActionChip"

export { ActionChip }
