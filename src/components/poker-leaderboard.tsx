"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  loadAllSessions,
  calculatePlayerTotals, 
  generateChartData,
  type SessionData,
  type PlayerTotal,
  type ChartDataPoint
} from "@/lib/csv-processor"

// Distinct colors for better chart visibility
const DISTINCT_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#6b7280", // Gray
]

export function PokerLeaderboard() {
  const [timeRange, setTimeRange] = React.useState("all")
  const [sessions, setSessions] = React.useState<SessionData[]>([])
  const [playerTotals, setPlayerTotals] = React.useState<PlayerTotal[]>([])
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([])
  const [chartConfig, setChartConfig] = React.useState<ChartConfig>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true)
        const sessionsData = await loadAllSessions()
        setSessions(sessionsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        console.error('Error loading sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  React.useEffect(() => {
    if (sessions.length === 0) return

    const totals = calculatePlayerTotals(sessions)
    const data = generateChartData(sessions)
    
    setPlayerTotals(totals)
    setChartData(data)

    // Generate chart config dynamically based on players with distinct colors
    const config: ChartConfig = {
      winnings: {
        label: "Winnings",
      },
    } satisfies ChartConfig

    totals.forEach((player, index) => {
      config[player.name] = {
        label: player.name,
        color: DISTINCT_COLORS[index % DISTINCT_COLORS.length],
      }
    })
    
    setChartConfig(config)
  }, [sessions])

  const filteredChartData = React.useMemo(() => {
    if (timeRange === "all") return chartData
    
    const now = new Date()
    let daysBack = 30
    
    switch (timeRange) {
      case "7d":
        daysBack = 7
        break
      case "30d":
        daysBack = 30
        break
      case "90d":
        daysBack = 90
        break
      default:
        return chartData
    }
    
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    return chartData.filter(point => new Date(point.date) >= cutoffDate)
  }, [chartData, timeRange])

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2)
    return amount >= 0 ? `+${formatted} €` : `-${formatted} €`
  }

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1: return "default" // Gold-ish
      case 2: return "secondary" // Silver-ish  
      case 3: return "outline" // Bronze-ish
      default: return "outline"
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Loading poker data...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">No poker sessions found. Add CSV files to the public/data/ directory.</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Chart Section */}
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Poker Performance History</CardTitle>
            <CardDescription>
              Cumulative profit/loss over time - each player&apos;s running total across all sessions
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
              aria-label="Select a value"
            >
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="rounded-lg">
                All time
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                Last 90 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[400px] w-full"
          >
            <LineChart data={filteredChartData}>
              <CartesianGrid vertical={false} />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value, payload) => {
                      if (payload && payload.length > 0) {
                        const dataPoint = payload[0].payload as ChartDataPoint
                        return `${dataPoint.sessionName} - Round ${dataPoint.round}`
                      }
                      return `Session: ${value}`
                    }}
                    formatter={(value, name) => {
                      // Hide entries with €0
                      if (value === 0) return [null, null]
                      return [
                        `${name}: ${formatCurrency(value as number)}`,
                        null,
                      ]
                    }}
                    indicator="dot"
                  />
                }
              />
              {Object.keys(chartConfig).map((player) => {
                if (player === 'winnings') return null
                return (
                  <Line
                    key={player}
                    dataKey={player}
                    type="monotone"
                    stroke={chartConfig[player]?.color}
                    strokeWidth={2}
                    dot={false}
                  />
                )
              })}
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Standings</CardTitle>
          <CardDescription>
            Overall performance across {sessions.length} poker sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              Rankings based on total winnings/losses across all sessions
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Avg per Session</TableHead>
                <TableHead className="text-right">Last Played</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playerTotals.map((player, index) => {
                const rank = index + 1
                const avgPerSession = player.total / player.sessions
                
                return (
                  <TableRow key={player.name}>
                    <TableCell>
                      <Badge variant={getRankBadgeVariant(rank)}>
                        #{rank}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell className={`text-right font-mono ${
                      player.total >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(player.total)}
                    </TableCell>
                    <TableCell className="text-right">{player.sessions}</TableCell>
                    <TableCell className={`text-right font-mono ${
                      avgPerSession >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(avgPerSession)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {player.lastSession}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 
 