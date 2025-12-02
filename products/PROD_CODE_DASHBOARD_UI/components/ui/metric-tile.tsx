import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { BreezyCard } from "./breezy-card"

interface MetricTileProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  color?: string // tailwind color class for icon/trend
  onClick?: () => void
}

export function MetricTile({ label, value, icon: Icon, trend, color = "text-cyan-500", onClick }: MetricTileProps) {
  return (
    <BreezyCard 
      className={cn("flex flex-col justify-between h-full min-h-[140px] p-5 hover:border-white/30 transition-colors cursor-default", onClick && "cursor-pointer active:scale-[0.98]")}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className={cn("p-2.5 rounded-2xl bg-white/50 dark:bg-white/5", color.replace('text-', 'bg-').replace('500', '500/10'))}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend.positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      </div>
    </BreezyCard>
  )
}
