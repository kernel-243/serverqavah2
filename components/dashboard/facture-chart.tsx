"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MonthlyData {
  _id: number
  total: number
}

interface FactureChartProps {
  data: MonthlyData[]
}

const TICK_FILL_LIGHT = "#64748b"
const TICK_FILL_DARK = "#94a3b8"
const GRID_STROKE_LIGHT = "rgba(0,0,0,0.1)"
const GRID_STROKE_DARK = "rgba(255,255,255,0.1)"

export function FactureChart({ data }: FactureChartProps) {
  const [chartType, setChartType] = useState<"area" | "bar">("area")
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const tickFill = isDark ? TICK_FILL_DARK : TICK_FILL_LIGHT
  const gridStroke = isDark ? GRID_STROKE_DARK : GRID_STROKE_LIGHT
  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]

  // Sort data by month and fill in missing months with zero values
  const sortedData = [...Array(12)].map((_, index) => {
    const monthData = data.find((item) => item._id === index + 1)
    return {
      month: monthNames[index],
      monthIndex: index + 1,
      revenue: monthData ? monthData.total : 0,
    }
  })

  // Calculate year-to-date total
  const ytdTotal = sortedData.reduce((sum, item) => sum + item.revenue, 0)

  // Calculate average monthly revenue
  const avgMonthlyRevenue = data.length > 0 ? ytdTotal / data.length : 0

  // Find highest and lowest months
  const highestMonth = [...sortedData].sort((a, b) => b.revenue - a.revenue)[0]
  const lowestMonth = [...sortedData].filter((item) => item.revenue > 0).sort((a, b) => a.revenue - b.revenue)[0] || {
    month: "N/A",
    revenue: 0,
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-blue-50 dark:bg-blue-950/50 p-2 rounded-md border border-blue-100 dark:border-blue-800">
            <div className="text-blue-600 dark:text-blue-400 font-medium">Total</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(ytdTotal)}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/50 p-2 rounded-md border border-green-100 dark:border-green-800">
            <div className="text-green-600 dark:text-green-400 font-medium">Moyenne</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(avgMonthlyRevenue)}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/50 p-2 rounded-md border border-purple-100 dark:border-purple-800">
            <div className="text-purple-600 dark:text-purple-400 font-medium">Meilleur mois</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">
              {highestMonth?.month}: {formatCurrency(highestMonth?.revenue || 0)}
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/50 p-2 rounded-md border border-amber-100 dark:border-amber-800">
            <div className="text-amber-600 dark:text-amber-400 font-medium">Mois le plus bas</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">
              {lowestMonth?.month}: {formatCurrency(lowestMonth?.revenue || 0)}
            </div>
          </div>
        </div>
        <Tabs
          defaultValue="area"
          className="w-[180px]"
          onValueChange={(value) => setChartType(value as "area" | "bar")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="area">Courbe</TabsTrigger>
            <TabsTrigger value="bar">Barres</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1">
        {chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: tickFill, fontSize: 12 }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? "#1e293b" : "#fff", border: isDark ? "1px solid #334155" : "1px solid #e2e8f0", borderRadius: "8px", color: isDark ? "#e2e8f0" : "#0f172a" }}
                labelStyle={{ color: isDark ? "#e2e8f0" : "#0f172a" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenu"]}
                labelFormatter={(label) => `Mois: ${label}`}
                cursor={{ stroke: "#8884d8", strokeWidth: 1, strokeDasharray: "5 5" }}
              />
              <Legend wrapperStyle={{ color: tickFill }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenu"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                activeDot={{ r: 8 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: tickFill, fontSize: 12 }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? "#1e293b" : "#fff", border: isDark ? "1px solid #334155" : "1px solid #e2e8f0", borderRadius: "8px", color: isDark ? "#e2e8f0" : "#0f172a" }}
                labelStyle={{ color: isDark ? "#e2e8f0" : "#0f172a" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenu"]}
                labelFormatter={(label) => `Mois: ${label}`}
                cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0, 0, 0, 0.05)" }}
              />
              <Legend wrapperStyle={{ color: tickFill }} />
              <Bar dataKey="revenue" name="Revenu" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
