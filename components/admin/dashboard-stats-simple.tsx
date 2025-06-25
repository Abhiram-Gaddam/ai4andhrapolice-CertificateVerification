"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, QrCode, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface SimpleStats {
  totalParticipants: number
  totalCertificates: number
  totalScans: number
  recentScans: number
}

export default function DashboardStatsSimple() {
  const [stats, setStats] = useState<SimpleStats>({
    totalParticipants: 0,
    totalCertificates: 0,
    totalScans: 0,
    recentScans: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSimpleStats()
  }, [])

  const fetchSimpleStats = async () => {
    try {
      // Just get basic counts without complex joins
      const participantsPromise = supabase.from("participants").select("id", { count: "exact", head: true })

      const [participantsResult] = await Promise.all([participantsPromise])

      setStats({
        totalParticipants: participantsResult.count || 0,
        totalCertificates: 0, // Will be updated when we have certificates
        totalScans: 0, // Will be updated when we have scans
        recentScans: 0, // Will be updated when we have recent scans
      })
    } catch (error) {
      console.error("Error fetching simple stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Participants",
      value: stats.totalParticipants,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Registered participants",
    },
    {
      title: "Certificates Generated",
      value: stats.totalCertificates,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "PDF certificates created",
    },
    {
      title: "Total QR Scans",
      value: stats.totalScans,
      icon: QrCode,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Verification page views",
    },
    {
      title: "Recent Scans (24h)",
      value: stats.recentScans,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Scans in last 24 hours",
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card
          key={index}
          className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-current"
        >
          <CardHeader
            className={`flex flex-row items-center justify-between space-y-0 pb-2 ${stat.bgColor} rounded-t-lg`}
          >
            <CardTitle className="text-sm font-medium text-gray-700">{stat.title}</CardTitle>
            <div className={`p-2 rounded-full bg-white shadow-sm`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value.toLocaleString()}</div>
            <p className="text-xs text-gray-600">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
