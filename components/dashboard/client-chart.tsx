"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { authRequest } from "@/lib/authRequest"

interface ClientData {
  month: string
  count: number
}

export function ClientChart() {
  const [data, setData] = useState<ClientData[]>([])

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const response = await authRequest(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/clients`)
        if (response.ok) {
          const clientData = await response.json()
          setData(clientData)
        } else {
          console.error("Failed to fetch client data")
        }
      } catch (error) {
        console.error("Error fetching client data:", error)
      }
    }

    fetchClientData()
  }, [])

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="url(#colorCount)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

