"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"

interface TrendData {
  month: number
  year: number
  count: number
  label: string
}

interface CommercialProspectChartProps {
  trends: TrendData[]
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export function CommercialProspectChart({ trends }: CommercialProspectChartProps) {
  const [chartType, setChartType] = useState<"line" | "bar">("line")

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end mb-4">
        <Tabs
          defaultValue="line"
          className="w-[180px]"
          onValueChange={(value) => setChartType(value as "line" | "bar")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="line">Courbe</TabsTrigger>
            <TabsTrigger value="bar">Barres</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1">
        {chartType === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <defs>
                <linearGradient id="colorProspects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [value, "Prospects"]}
                labelFormatter={(label) => `Période: ${label}`}
                cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "5 5" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Prospects"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorProspects)"
                activeDot={{ r: 8 }}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [value, "Prospects"]}
                labelFormatter={(label) => `Période: ${label}`}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
              <Legend />
              <Bar dataKey="count" name="Prospects" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

interface StatusPieChartProps {
  data: Array<{ name: string; value: number; color: string }>
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value, "Nombre"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

