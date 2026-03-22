import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "blue" | "emerald" | "amber" | "purple" | "red";
  isCurrency?: boolean;
}

const colorMap = {
  blue:    { bg: "bg-blue-50",   icon: "bg-blue-600",   text: "text-blue-600"   },
  emerald: { bg: "bg-emerald-50",icon: "bg-emerald-600",text: "text-emerald-600" },
  amber:   { bg: "bg-amber-50",  icon: "bg-amber-500",  text: "text-amber-600"  },
  purple:  { bg: "bg-purple-50", icon: "bg-purple-600", text: "text-purple-600" },
  red:     { bg: "bg-red-50",    icon: "bg-red-600",    text: "text-red-600"    },
};

export function KPICard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  color = "blue",
  isCurrency = false,
}: KPICardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors.icon)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.value >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">
          {isCurrency && typeof value === "number" ? formatINR(value) : value}
        </p>
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}
