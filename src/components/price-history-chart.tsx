"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PriceHistoryChartProps {
  itemId: string
}

export function PriceHistoryChart({ itemId }: PriceHistoryChartProps) {
  const [data, setData] = useState<any[]>([])
  const [period, setPeriod] = useState("30d")

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`/api/price-history/${itemId}?period=${period}`)
      const result = await response.json()
      setData(result.data)
    }
    fetchData()
  }, [itemId, period])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="1y">1y</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          />
          <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value: any) => [`$${value.toFixed(2)}`, "Price"]}
          />
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
