"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, QrCode, TrendingUp, Download, Eye, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Stats {
  totalParticipants: number
  totalCertificates: number
  totalScans: number
  recentScans: number
  manualEntries: number
  bulkUploads: number
  avgScansPerCertificate: number
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalParticipants: 0,
    totalCertificates: 0,
    totalScans: 0,
    recentScans: 0,
    manualEntries: 0,
    bulkUploads: 0,
    avgScansPerCertificate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Use Promise.allSettled to prevent one failed query from breaking everything
      const results = await Promise.allSettled([
        // Get total participants
        supabase
          .from("participants")
          .select("*", { count: "exact", head: true }),

        // Get total certificates (participants with certificate_url)
        supabase
          .from("participants")
          .select("*", { count: "exact", head: true })
          .not("certificate_url", "is", null),

        // Get total scans (with fallback)
        supabase
          .from("qr_scan_logs")
          .select("*", { count: "exact", head: true }),

        // Get recent scans (last 24 hours)
        (() => {
          const oneDayAgo = new Date()
          oneDayAgo.setDate(oneDayAgo.getDate() - 1)
          return supabase
            .from("qr_scan_logs")
            .select("*", { count: "exact", head: true })
            .gte("scanned_at", oneDayAgo.toISOString())
        })(),

        // Get manual entries (with fallback)
        supabase
          .from("certificate_logs")
          .select("*", { count: "exact", head: true })
          .eq("generation_type", "manual"),

        // Get bulk entries (with fallback)
        supabase
          .from("certificate_logs")
          .select("*", { count: "exact", head: true })
          .eq("generation_type", "bulk"),
      ])

      // Extract results with fallbacks
      const participantsCount = results[0].status === "fulfilled" ? results[0].value.count || 0 : 0
      const certificatesCount = results[1].status === "fulfilled" ? results[1].value.count || 0 : 0
      const scansCount = results[2].status === "fulfilled" ? results[2].value.count || 0 : 0
      const recentScansCount = results[3].status === "fulfilled" ? results[3].value.count || 0 : 0
      const manualCount = results[4].status === "fulfilled" ? results[4].value.count || 0 : 0
      const bulkCount = results[5].status === "fulfilled" ? results[5].value.count || 0 : 0

      // Calculate average scans per certificate
      const avgScans = certificatesCount > 0 ? Math.round((scansCount / certificatesCount) * 10) / 10 : 0

      setStats({
        totalParticipants: participantsCount,
        totalCertificates: certificatesCount,
        totalScans: scansCount,
        recentScans: recentScansCount,
        manualEntries: manualCount,
        bulkUploads: bulkCount,
        avgScansPerCertificate: avgScans,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      // Set default stats if everything fails
      setStats({
        totalParticipants: 0,
        totalCertificates: 0,
        totalScans: 0,
        recentScans: 0,
        manualEntries: 0,
        bulkUploads: 0,
        avgScansPerCertificate: 0,
      })
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
    {
      title: "Manual Entries",
      value: stats.manualEntries,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      description: "Manually added participants",
    },
    {
      title: "Bulk Uploads",
      value: stats.bulkUploads,
      icon: Download,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      description: "Excel bulk imports",
    },
    {
      title: "Avg. Scans/Certificate",
      value: stats.avgScansPerCertificate,
      icon: TrendingUp,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      description: "Average verification views",
    },
    {
      title: "Verification Rate",
      value: `${stats.totalCertificates > 0 ? Math.round((stats.totalScans / stats.totalCertificates) * 100) : 0}%`,
      icon: Eye,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      description: "Certificates that were scanned",
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
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
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
            </div>
            <p className="text-xs text-gray-600">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
