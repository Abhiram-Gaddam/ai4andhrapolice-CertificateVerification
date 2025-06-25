"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Replace this import
// import DashboardStats from "@/components/admin/dashboard-stats"

// With this import
import DashboardStatsSimple from "@/components/admin/dashboard-stats-simple"
import ParticipantsTable from "@/components/admin/participants-table"
import CertificateDesigner from "@/components/admin/certificate-designer"
import BulkUpload from "@/components/admin/bulk-upload"
import AnalyticsDashboard from "@/components/admin/analytics-dashboard"

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage certificates and participants</p>
        </div>

        <div className="mb-8">
          <DashboardStatsSimple />
        </div>

        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="designer">Certificate Designer</TabsTrigger>
            <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <ParticipantsTable />
          </TabsContent>

          <TabsContent value="designer">
            <CertificateDesigner />
          </TabsContent>

          <TabsContent value="upload">
            <BulkUpload />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
