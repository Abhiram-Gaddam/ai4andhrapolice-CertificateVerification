"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Plus, FileText, QrCode, Trash2, Users, DownloadCloud } from "lucide-react"
import { supabase } from "@/lib/supabase"
import AddParticipantForm from "./add-participant-form"
import { generateCertificatePDF, downloadPDF } from "@/lib/pdf-generator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import JSZip from "jszip"

interface Participant {
  id: string
  name: string
  email: string
  college: string
  role: string
  verification_id: string
  certificate_url: string | null
  created_at: string
  qr_scan_count?: number
}

interface Template {
  id: string
  name: string
  background_url: string
  name_position: { x: number; y: number }
  qr_position: { x: number; y: number }
  name_style: any
  qr_size: number
  template_width: number
  template_height: number
}

export default function ParticipantsTable() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchParticipants()
    fetchTemplates()
  }, [])

  const fetchParticipants = async () => {
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .order("created_at", { ascending: false })

      if (participantsError) {
        console.error("Error fetching participants:", participantsError)
        setError("Failed to fetch participants")
        return
      }

      const participantsWithScans = (participantsData || []).map((participant) => ({
        ...participant,
        qr_scan_count: 0,
      }))

      setParticipants(participantsWithScans)
    } catch (error) {
      console.error("Error fetching participants:", error)
      setError("Failed to fetch participants")
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setTemplates(data || [])

      // Auto-select the first template
      if (data && data.length > 0) {
        setSelectedTemplate(data[0].id)
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    }
  }

  const filteredParticipants = participants.filter((participant) => {
    const matchesSearch =
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.verification_id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" || participant.role === roleFilter

    return matchesSearch && matchesRole
  })

  const handleViewCertificate = (verificationId: string) => {
    window.open(`/verify/${verificationId}`, "_blank")
  }

  const getSelectedTemplate = (): Template | null => {
    if (!selectedTemplate) return templates[0] || null
    return templates.find((t) => t.id === selectedTemplate) || templates[0] || null
  }

  const handleGenerateCertificate = async (participant: Participant) => {
    const template = getSelectedTemplate()

    if (!template) {
      setError("No certificate templates available. Please create a template first.")
      return
    }

    setGenerating(participant.id)
    setError("")

    try {
      console.log("Using template:", template.name)
      console.log("Template positions:", {
        name: template.name_position,
        qr: template.qr_position,
        size: { width: template.template_width, height: template.template_height },
      })

      const pdfBlob = await generateCertificatePDF(participant, template)

      // Download the certificate
      downloadPDF(pdfBlob, `certificate-${participant.verification_id}.pdf`)

      // Update participant record
      await supabase
        .from("participants")
        .update({
          certificate_url: `certificate-${participant.verification_id}.pdf`,
          certificate_generated_at: new Date().toISOString(),
        })
        .eq("id", participant.id)

      // Log the certificate generation
      await supabase.from("certificate_logs").insert({
        participant_id: participant.id,
        template_id: template.id,
        generation_type: "manual",
        status: "completed",
      })

      setSuccess(`Certificate generated for ${participant.name} using template "${template.name}"`)
      setTimeout(() => setSuccess(""), 3000)
      fetchParticipants()
    } catch (err: any) {
      console.error("Certificate generation error:", err)
      setError(err.message || "Error generating certificate")
    } finally {
      setGenerating(null)
    }
  }

  const handleBulkDownload = async () => {
    const template = getSelectedTemplate()

    if (!template) {
      setError("No certificate templates available. Please create a template first.")
      return
    }

    if (filteredParticipants.length === 0) {
      setError("No participants to generate certificates for.")
      return
    }

    setBulkGenerating(true)
    setError("")

    try {
      const zip = new JSZip()
      let successCount = 0
      let errorCount = 0

      setSuccess(`Generating ${filteredParticipants.length} certificates using template "${template.name}"...`)

      for (let i = 0; i < filteredParticipants.length; i++) {
        const participant = filteredParticipants[i]

        try {
          console.log(`Generating certificate ${i + 1}/${filteredParticipants.length} for ${participant.name}`)

          const pdfBlob = await generateCertificatePDF(participant, template)

          // Add to ZIP file
          zip.file(
            `certificate-${participant.verification_id}-${participant.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
            pdfBlob,
          )

          // Update participant record
          await supabase
            .from("participants")
            .update({
              certificate_url: `certificate-${participant.verification_id}.pdf`,
              certificate_generated_at: new Date().toISOString(),
            })
            .eq("id", participant.id)

          // Log the certificate generation
          await supabase.from("certificate_logs").insert({
            participant_id: participant.id,
            template_id: template.id,
            generation_type: "bulk",
            status: "completed",
          })

          successCount++

          // Update progress
          setSuccess(`Generated ${successCount}/${filteredParticipants.length} certificates...`)
        } catch (err) {
          console.error(`Error generating certificate for ${participant.name}:`, err)
          errorCount++
        }
      }

      // Generate and download ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `certificates-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess(
        `Bulk download complete! Generated ${successCount} certificates successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
      )
      setTimeout(() => setSuccess(""), 5000)
      fetchParticipants()
    } catch (err: any) {
      console.error("Bulk download error:", err)
      setError(err.message || "Error during bulk download")
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleDeleteParticipant = async (participant: Participant) => {
    if (!confirm(`Are you sure you want to delete ${participant.name}?`)) return

    try {
      const { error } = await supabase.from("participants").delete().eq("id", participant.id)

      if (error) throw error

      setSuccess(`${participant.name} deleted successfully`)
      setTimeout(() => setSuccess(""), 3000)
      fetchParticipants()
    } catch (err: any) {
      setError(err.message || "Error deleting participant")
    }
  }

  const handleParticipantAdded = () => {
    fetchParticipants()
    setDialogOpen(false)
  }

  const uniqueRoles = [...new Set(participants.map((p) => p.role))].filter(Boolean)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Participants ({filteredParticipants.length})</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Manage participant certificates and verification</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Participant</DialogTitle>
              </DialogHeader>
              <AddParticipantForm onSuccess={handleParticipantAdded} />
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleBulkDownload}
            disabled={bulkGenerating || filteredParticipants.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {bulkGenerating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <DownloadCloud className="h-4 w-4 mr-2" />
                Download All ({filteredParticipants.length})
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Template Selection */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Certificate Template</h3>
              <p className="text-sm text-blue-700">Select which template to use for certificate generation</p>
            </div>
            <div className="w-64">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.template_width}×{template.template_height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedTemplate && (
            <div className="mt-2 text-xs text-blue-600">
              Using: {templates.find((t) => t.id === selectedTemplate)?.name} - Name at (
              {templates.find((t) => t.id === selectedTemplate)?.name_position.x},{" "}
              {templates.find((t) => t.id === selectedTemplate)?.name_position.y}), QR at (
              {templates.find((t) => t.id === selectedTemplate)?.qr_position.x},{" "}
              {templates.find((t) => t.id === selectedTemplate)?.qr_position.y})
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {uniqueRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verification ID</TableHead>
                <TableHead>Scans</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">{participant.name}</TableCell>
                  <TableCell>{participant.email || "—"}</TableCell>
                  <TableCell>{participant.college || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{participant.role}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{participant.verification_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <QrCode className="h-3 w-3 text-gray-500" />
                      <span className="text-sm">{participant.qr_scan_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={participant.certificate_url ? "default" : "secondary"}>
                      {participant.certificate_url ? "Certificate Generated" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCertificate(participant.verification_id)}
                        title="View verification page"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateCertificate(participant)}
                        disabled={generating === participant.id}
                        title="Generate certificate PDF"
                      >
                        {generating === participant.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteParticipant(participant)}
                        title="Delete participant"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No participants found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
