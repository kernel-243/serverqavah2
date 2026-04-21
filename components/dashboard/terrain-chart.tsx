"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { useState } from "react"

interface TerrainChartProps {
  available: number
  total: number
  // New props for detailed terrain status
  statusData?: {
    disponible: number
    enCours: number
    reserve: number
    vendu: number
    annule: number
    cede: number
  }
}

export function TerrainChart({ available, total, statusData }: TerrainChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // If we have detailed status data, use it; otherwise, use the simple available/occupied data
  const chartData = statusData
    ? [
        { name: "Disponible", value: statusData.disponible, color: "#10B981" },
        { name: "Réservé", value: statusData.reserve, color: "#F59E0B" },
        { name: "En cours", value: statusData.enCours, color: "#F59E0B" },
        { name: "Vendu", value: statusData.vendu , color: "#6366F1" },
        { name: "Annulé", value: statusData.annule, color: "#EF4444" },
        { name: "Cédé", value: statusData.cede, color: "#8B5CF6" },
      ]
    : [
        { name: "Disponible", value: available, color: "#10B981" },
        { name: "Occupé", value: total - available, color: "#6366F1" },
      ]

  // Filter out zero values
  const filteredData = chartData.filter((item) => item.value > 0)

  const handleMouseEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const handleMouseLeave = () => {
    setActiveIndex(null)
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={filteredData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
        barSize={36}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number, name: string) => [`${value} terrain${value > 1 ? "s" : ""}`, name]}
          cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
        />
        <Legend />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {filteredData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              fillOpacity={activeIndex === index ? 1 : 0.8}
              stroke={entry.color}
              strokeWidth={activeIndex === index ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
