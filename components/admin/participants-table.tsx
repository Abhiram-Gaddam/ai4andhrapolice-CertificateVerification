"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Eye,
  Plus,
  FileText,
  QrCode,
  Trash2,
  Users,
  DownloadCloud,
  AlertTriangle,
  Download,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import AddParticipantForm from "./add-participant-form"
import { generateCertificatePDF, downloadPDF } from "@/lib/pdf-generator"
import { generateHighResQRCode, getVerificationURL } from "@/lib/qr-generator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const STATIC_PASSWORD = "admin@123" // Define static password

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
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloadingQR, setDownloadingQR] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [loginError, setLoginError] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput === STATIC_PASSWORD) {
      setIsAuthenticated(true)
      setLoginError("")
    } else {
      setLoginError("Incorrect password")
      setPasswordInput("")
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchParticipants()
      fetchTemplates()
    }
  }, [isAuthenticated])

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

  const handleViewInvitation = (verificationId: string) => {
    const verificationUrl = `https://ai4andhrapolice-certificate-verific.vercel.app/verify/${verificationId}`
    window.open(verificationUrl, "_blank")
  }

  const handleViewQR = async (participant: Participant) => {
    try {
      const verificationURL = getVerificationURL(participant.verification_id)
      const qrCodeDataURL = await generateHighResQRCode(verificationURL, 400)

      const newWindow = window.open("", "_blank", "width=500,height=600")
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${participant.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px; 
                  background: #f5f5f5;
                }
                .container {
                  background: white;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  max-width: 400px;
                  margin: 0 auto;
                }
                .qr-code { 
                  margin: 20px 0; 
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  padding: 10px;
                  background: white;
                }
                .participant-info {
                  margin-bottom: 20px;
                  padding: 15px;
                  background: #f8f9fa;
                  border-radius: 8px;
                }
                .verification-id {
                  font-family: monospace;
                  background: #e9ecef;
                  padding: 5px 10px;
                  border-radius: 4px;
                  font-size: 12px;
                }
                .download-btn {
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 5px;
                  cursor: pointer;
                  margin: 5px;
                }
                .download-btn:hover {
                  background: #0056b3;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>QR Code for Certificate Verification</h2>
                <div class="participant-info">
                  <h3>${participant.name}</h3>
                  <p><strong>Role:</strong> ${participant.role}</p>
                  <p><strong>College:</strong> ${participant.college || "N/A"}</p>
                  <p class="verification-id">ID: ${participant.verification_id}</p>
                </div>
                <div class="qr-code">
                  <img src="${qrCodeDataURL}" alt="QR Code" style="max-width: 100%; height: auto;" />
                </div>
                <p style="font-size: 12px; color: #666; margin-top: 15px;">
                  Scan this QR code to verify the certificate
                </p>
                <button class="download-btn" onclick="downloadQR()">Download QR Code</button>
                <button class="download-btn" onclick="window.print()">Print QR Code</button>
              </div>
              <script>
                function downloadQR() {
                  const link = document.createElement('a');
                  link.download = 'qr-code-${participant.verification_id}.png';
                  link.href = '${qrCodeDataURL}';
                  link.click();
                }
              </script>
            </body>
          </html>
        `)
        newWindow.document.close()
      }
    } catch (error) {
      console.error("Error generating QR code:", error)
      setError("Failed to generate QR code")
    }
  }

  const handleDownloadQR = async (participant: Participant) => {
    setDownloadingQR(participant.id)
    try {
      const verificationURL = getVerificationURL(participant.verification_id)
      const qrCodeDataURL = await generateHighResQRCode(verificationURL, 600)

      const link = document.createElement("a")
      link.download = `qr-code-${participant.verification_id}-${participant.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`
      link.href = qrCodeDataURL
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setSuccess(`QR code downloaded for ${participant.name}`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error downloading QR code:", error)
      setError("Failed to download QR code")
    } finally {
      setDownloadingQR(null)
    }
  }

  const getSelectedTemplate = (): Template | null => {
    if (!selectedTemplate) return templates[0] || null
    return templates.find((t) => t.id === selectedTemplate) || templates[0] || null
  }

  const handleDownloadInvitation = async (participant: Participant) => {
    const template = getSelectedTemplate()

    if (!template) {
      setError("No certificate templates available. Please create a template first.")
      return
    }

    setGenerating(participant.id)
    setError("")

    try {
      console.log("Generating invitation certificate for:", participant.name)
      const pdfBlob = await generateCertificatePDF(participant, template)

      downloadPDF(
        pdfBlob,
        `invitation-${participant.verification_id}-${participant.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      )

      await supabase
        .from("participants")
        .update({
          certificate_url: `invitation-${participant.verification_id}.pdf`,
          certificate_generated_at: new Date().toISOString(),
        })
        .eq("id", participant.id)

      await supabase.from("certificate_logs").insert({
        participant_id: participant.id,
        template_id: template.id,
        generation_type: "manual",
        status: "completed",
      })

      setSuccess(`Invitation downloaded for ${participant.name}`)
      setTimeout(() => setSuccess(""), 3000)
      fetchParticipants()
    } catch (err: any) {
      console.error("Invitation generation error:", err)
      setError(err.message || "Error generating invitation")
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
      setError("No participants to generate invitations for.")
      return
    }

    setBulkGenerating(true)
    setError("")

    try {
      const zip = new JSZip()
      let successCount = 0
      let errorCount = 0

      setSuccess(`Generating ${filteredParticipants.length} invitations using template "${template.name}"...`)

      for (let i = 0; i < filteredParticipants.length; i++) {
        const participant = filteredParticipants[i]

        try {
          console.log(`Generating invitation ${i + 1}/${filteredParticipants.length} for ${participant.name}`)

          const pdfBlob = await generateCertificatePDF(participant, template)

          zip.file(
            `invitation-${participant.verification_id}-${participant.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
            pdfBlob,
          )

          await supabase
            .from("participants")
            .update({
              certificate_url: `invitation-${participant.verification_id}.pdf`,
              certificate_generated_at: new Date().toISOString(),
            })
            .eq("id", participant.id)

          await supabase.from("certificate_logs").insert({
            participant_id: participant.id,
            template_id: template.id,
            generation_type: "bulk",
            status: "completed",
          })

          successCount++
          setSuccess(`Generated ${successCount}/${filteredParticipants.length} invitations...`)
        } catch (err) {
          console.error(`Error generating invitation for ${participant.name}:`, err)
          errorCount++
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `invitations-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess(
        `Bulk download complete! Generated ${successCount} invitations successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
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

  const handleBulkDownloadQR = async () => {
    if (filteredParticipants.length === 0) {
      setError("No participants to generate QR codes for.")
      return
    }

    setBulkGenerating(true)
    setError("")

    try {
      const zip = new JSZip()
      let successCount = 0

      setSuccess(`Generating ${filteredParticipants.length} QR codes...`)

      for (let i = 0; i < filteredParticipants.length; i++) {
        const participant = filteredParticipants[i]

        try {
          const verificationURL = getVerificationURL(participant.verification_id)
          const qrCodeDataURL = await generateHighResQRCode(verificationURL, 600)

          const response = await fetch(qrCodeDataURL)
          const blob = await response.blob()

          zip.file(`qr-code-${participant.verification_id}-${participant.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`, blob)

          successCount++
          setSuccess(`Generated ${successCount}/${filteredParticipants.length} QR codes...`)
        } catch (err) {
          console.error(`Error generating QR code for ${participant.name}:`, err)
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `qr-codes-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess(`Bulk QR download complete! Generated ${successCount} QR codes successfully.`)
      setTimeout(() => setSuccess(""), 5000)
    } catch (err: any) {
      console.error("Bulk QR download error:", err)
      setError(err.message || "Error during bulk QR download")
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleDeleteParticipant = async (participant: Participant) => {
    if (
      !confirm(
        `Are you sure you want to delete ${participant.name}? This will also delete all related QR scan logs and certificate logs.`,
      )
    )
      return

    setDeleting(participant.id)
    setError("")

    try {
      console.log(`Deleting participant ${participant.name} and related records...`)

      const { error: qrLogsError } = await supabase.from("qr_scan_logs").delete().eq("participant_id", participant.id)

      if (qrLogsError) {
        console.warn("Error deleting QR scan logs:", qrLogsError)
      }

      const { error: certLogsError } = await supabase
        .from("certificate_logs")
        .delete()
        .eq("participant_id", participant.id)

      if (certLogsError) {
        console.warn("Error deleting certificate logs:", certLogsError)
      }

      const { error: participantError } = await supabase.from("participants").delete().eq("id", participant.id)

      if (participantError) {
        throw participantError
      }

      setSuccess(`${participant.name} and all related records deleted successfully`)
      setTimeout(() => setSuccess(""), 3000)
      fetchParticipants()
    } catch (err: any) {
      console.error("Delete error:", err)

      if (err.message.includes("foreign key constraint")) {
        setError(
          `Cannot delete ${participant.name} because there are related records. Please run the database fix script first or contact the administrator.`,
        )
      } else {
        setError(err.message || `Error deleting ${participant.name}`)
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDelete = async () => {
    if (filteredParticipants.length === 0) {
      setError("No participants to delete.")
      return
    }

    const confirmMessage = `Are you sure you want to delete all ${filteredParticipants.length} filtered participants? This action cannot be undone and will delete all related QR scan logs and certificate logs.`

    if (!confirm(confirmMessage)) return

    setBulkGenerating(true)
    setError("")

    try {
      let successCount = 0
      let errorCount = 0

      setSuccess(`Deleting ${filteredParticipants.length} participants...`)

      for (let i = 0; i < filteredParticipants.length; i++) {
        const participant = filteredParticipants[i]

        try {
          await supabase.from("qr_scan_logs").delete().eq("participant_id", participant.id)
          await supabase.from("certificate_logs").delete().eq("participant_id", participant.id)

          const { error } = await supabase.from("participants").delete().eq("id", participant.id)

          if (error) throw error

          successCount++
          setSuccess(`Deleted ${successCount}/${filteredParticipants.length} participants...`)
        } catch (err) {
          console.error(`Error deleting ${participant.name}:`, err)
          errorCount++
        }
      }

      setSuccess(
        `Bulk deletion complete! Deleted ${successCount} participants successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
      )
      setTimeout(() => setSuccess(""), 5000)
      fetchParticipants()
    } catch (err: any) {
      console.error("Bulk delete error:", err)
      setError(err.message || "Error during bulk deletion")
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleParticipantAdded = () => {
    fetchParticipants()
    setDialogOpen(false)
  }

  const uniqueRoles = [...new Set(participants.map((p) => p.role))].filter(Boolean)

  if (!isAuthenticated) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              {loginError && (
                <p className="text-red-500 text-sm mt-1">{loginError}</p>
              )}
            </div>
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    )
  }

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
          <p className="text-sm text-gray-600 mt-1">Manage participant invitations, QR codes, and verification</p>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={filteredParticipants.length === 0}>
                <DownloadCloud className="h-4 w-4 mr-2" />
                Bulk Actions ({filteredParticipants.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Download Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleBulkDownload} disabled={bulkGenerating}>
                <FileText className="h-4 w-4 mr-2" />
                Download All Invitations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkDownloadQR} disabled={bulkGenerating}>
                <QrCode className="h-4 w-4 mr-2" />
                Download All QR Codes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Danger Zone</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleBulkDelete}
                disabled={bulkGenerating}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All ({filteredParticipants.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes("foreign key constraint") && (
                <div className="mt-2">
                  <p className="text-sm">
                    <strong>Fix:</strong> Run the database fix script to resolve foreign key constraints.
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Certificate Template</h3>
              <p className="text-sm text-blue-700">Select which template to use for invitation generation</p>
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
                <TableHead className="text-center">Actions</TableHead>
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
                      {participant.certificate_url ? "Invitation Generated" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvitation(participant.verification_id)}
                        title="View invitation page"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvitation(participant)}
                        disabled={generating === participant.id}
                        title="Download invitation PDF"
                        className="h-8 w-8 p-0"
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
                        onClick={() => handleViewQR(participant)}
                        title="View QR code"
                        className="h-8 w-8 p-0"
                      >
                        <QrCode className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadQR(participant)}
                        disabled={downloadingQR === participant.id}
                        title="Download QR code"
                        className="h-8 w-8 p-0"
                      >
                        {downloadingQR === participant.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteParticipant(participant)}
                        disabled={deleting === participant.id}
                        title="Delete participant"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      >
                        {deleting === participant.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></div>
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
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