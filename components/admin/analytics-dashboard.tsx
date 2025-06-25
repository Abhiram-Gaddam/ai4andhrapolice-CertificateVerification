"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Calendar, Clock, Eye, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface ScanLog {
  id: string
  scanned_at: string
  participant: {
    name: string
    verification_id: string
    role: string
  }
}

interface DailyStats {
  date: string
  scans: number
}

export default function AnalyticsDashboard() {
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      // Use Promise.allSettled to prevent failures
      const results = await Promise.allSettled([
        // Fetch recent scan logs with simpler query
        supabase
          .from("qr_scan_logs")
          .select(`
          id,
          scanned_at,
          participant_id
        `)
          .order("scanned_at", { ascending: false })
          .limit(20),

        // Fetch participants separately
        supabase
          .from("participants")
          .select("id, name, verification_id, role"),
      ])

      let scanLogs: ScanLog[] = []
      let participants: any[] = []

      if (results[0].status === "fulfilled" && results[0].value.data) {
        const rawLogs = results[0].value.data
        if (results[1].status === "fulfilled" && results[1].value.data) {
          participants = results[1].value.data

          // Manually join the data
          scanLogs = rawLogs.map((log) => ({
            id: log.id,
            scanned_at: log.scanned_at,
            participant: participants.find((p) => p.id === log.participant_id) || {
              name: "Unknown",
              verification_id: "N/A",
              role: "Unknown",
            },
          }))
        }
      }

      // Create simple daily statistics from the logs we have
      const dailyMap = new Map<string, number>()
      scanLogs.forEach((log) => {
        const date = new Date(log.scanned_at).toLocaleDateString()
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
      })

      const dailyStatsArray = Array.from(dailyMap.entries()).map(([date, scans]) => ({
        date,
        scans,
      }))

      setScanLogs(scanLogs)
      setDailyStats(dailyStatsArray)
    } catch (error) {
      console.error("Error fetching analytics:", error)
      // Set empty data on error
      setScanLogs([])
      setDailyStats([])
    } finally {
      setLoading(false)
    }
  }

  const totalScans = scanLogs.length
  const todayScans = scanLogs.filter((log) => {
    const today = new Date().toDateString()
    const logDate = new Date(log.scanned_at).toDateString()
    return today === logDate
  }).length

  const uniqueParticipants = new Set(scanLogs.map((log) => log.participant?.verification_id)).size

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScans}</div>
            <p className="text-xs text-muted-foreground">All time QR code scans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Scans</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayScans}</div>
            <p className="text-xs text-muted-foreground">Scans in the last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Participants</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueParticipants}</div>
            <p className="text-xs text-muted-foreground">Different certificates scanned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Daily Scans</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyStats.length > 0
                ? Math.round(dailyStats.reduce((sum, day) => sum + day.scans, 0) / dailyStats.length)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Average scans per day</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Scans Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Scan Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              scans: {
                label: "Scans",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="scans" fill="var(--color-scans)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Scan Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent QR Code Scans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Verification ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Scanned At</TableHead>
                  <TableHead>Time Ago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.participant?.name || "Unknown"}</TableCell>
                    <TableCell className="font-mono text-sm">{log.participant?.verification_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.participant?.role}</Badge>
                    </TableCell>
                    <TableCell>{new Date(log.scanned_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {Math.round((Date.now() - new Date(log.scanned_at).getTime()) / (1000 * 60))} min ago
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
