"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Download, Eye, Maximize2, Move, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { generateHighResQRCode, getVerificationURL } from "@/lib/qr-generator"
import { generateCertificatePDF, downloadPDF } from "@/lib/pdf-generator"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Template {
  id: string
  name: string
  background_url: string
  name_position: { x: number; y: number }
  qr_position: { x: number; y: number }
  name_style: { fontSize: number; color: string; fontFamily: string; fontWeight?: string }
  qr_size?: number
  template_width?: number
  template_height?: number
}

interface PreviewData {
  name: string
  role: string
  college: string
  verificationId: string
}

export default function LivePreview() {
  const [template, setTemplate] = useState<Template | null>(null)
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData>({
    name: "John Doe",
    role: "Participant",
    college: "Sample University",
    verificationId: "CERT-2024-PREVIEW",
  })
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [generating, setGenerating] = useState(false)
  const [draggedElement, setDraggedElement] = useState<"name" | "qr" | null>(null)
  const [previewSize, setPreviewSize] = useState({ width: 800, height: 600 })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const router = useRouter()
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([])
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLatestTemplate()
    fetchAllTemplates()
  }, [])

  useEffect(() => {
    if (previewData.verificationId) {
      generateQRCode()
    }
  }, [previewData.verificationId])

  useEffect(() => {
    const updatePreviewSize = () => {
      if (previewRef.current && template) {
        const containerWidth = previewRef.current.clientWidth
        const aspectRatio = (template.template_height || 600) / (template.template_width || 800)
        const newWidth = Math.min(containerWidth - 40, 800)
        const newHeight = newWidth * aspectRatio
        setPreviewSize({ width: newWidth, height: newHeight })
      }
    }

    updatePreviewSize()
    window.addEventListener("resize", updatePreviewSize)
    return () => window.removeEventListener("resize", updatePreviewSize)
  }, [template])

  // Check for unsaved changes
  useEffect(() => {
    if (template && originalTemplate) {
      const hasChanges =
        template.name_position.x !== originalTemplate.name_position.x ||
        template.name_position.y !== originalTemplate.name_position.y ||
        template.qr_position.x !== originalTemplate.qr_position.x ||
        template.qr_position.y !== originalTemplate.qr_position.y ||
        template.qr_size !== originalTemplate.qr_size ||
        template.name_style.fontSize !== originalTemplate.name_style.fontSize ||
        template.name_style.color !== originalTemplate.name_style.color
      setHasUnsavedChanges(hasChanges)
    }
  }, [template, originalTemplate])

  const fetchLatestTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error("Error fetching template:", error)
        setError("No template found. Please create a template first.")
      } else {
        console.log("Loaded template for preview:", data.name)
        setTemplate(data)
        setOriginalTemplate(JSON.parse(JSON.stringify(data))) // Deep copy
      }
    } catch (error) {
      console.error("Error fetching template:", error)
      setError("Failed to load template")
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    try {
      const verificationURL = getVerificationURL(previewData.verificationId)
      const qrCode = await generateHighResQRCode(verificationURL, 200)
      setQrCodeUrl(qrCode)
    } catch (error) {
      console.error("Error generating QR code:", error)
    }
  }

  const fetchAllTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setAvailableTemplates(data || [])
    } catch (error) {
      console.error("Error fetching all templates:", error)
    }
  }

  const handleMouseDown = (element: "name" | "qr", event: React.MouseEvent) => {
    event.preventDefault()
    setDraggedElement(element)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!draggedElement || !previewRef.current || !template) return

    const rect = previewRef.current.getBoundingClientRect()
    const scaleX = (template.template_width || 800) / previewSize.width
    const scaleY = (template.template_height || 600) / previewSize.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    if (draggedElement === "name") {
      setTemplate((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          name_position: {
            x: Math.max(50, Math.min(x, (prev.template_width || 800) - 50)),
            y: Math.max(50, Math.min(y, (prev.template_height || 600) - 50)),
          },
        }
      })
    } else if (draggedElement === "qr") {
      setTemplate((prev) => {
        if (!prev) return prev
        const qrSize = prev.qr_size || 100
        return {
          ...prev,
          qr_position: {
            x: Math.max(qrSize / 2, Math.min(x, (prev.template_width || 800) - qrSize / 2)),
            y: Math.max(qrSize / 2, Math.min(y, (prev.template_height || 600) - qrSize / 2)),
          },
        }
      })
    }
  }

  const handleMouseUp = () => {
    setDraggedElement(null)
  }

  const handleSaveChanges = async () => {
    if (!template || !hasUnsavedChanges) return

    try {
      const { error } = await supabase
        .from("certificate_templates")
        .update({
          name_position: template.name_position,
          qr_position: template.qr_position,
          name_style: template.name_style,
          qr_size: template.qr_size,
        })
        .eq("id", template.id)

      if (error) throw error

      setOriginalTemplate(JSON.parse(JSON.stringify(template)))
      setSuccess("Template changes saved successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error saving changes:", error)
      setError("Failed to save changes")
    }
  }

  const handleResetChanges = () => {
    if (originalTemplate) {
      setTemplate(JSON.parse(JSON.stringify(originalTemplate)))
    }
  }

  const downloadAsImage = async () => {
    if (!template) {
      setError("No template selected. Please select a template first.")
      return
    }

    setGenerating(true)
    try {
      console.log("Generating image with current template positions:", {
        name: template.name_position,
        qr: template.qr_position,
      })

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      const width = template.template_width || 800
      const height = template.template_height || 600
      const qrSize = template.qr_size || 100

      canvas.width = width
      canvas.height = height

      // Load and draw background
      const bgImg = new Image()
      bgImg.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        bgImg.onload = resolve
        bgImg.onerror = reject

        if (template.background_url.includes("placeholder.svg")) {
          // Create gradient background for placeholder
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
          gradient.addColorStop(0, "#f7fafc")
          gradient.addColorStop(1, "#edf2f7")

          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Add border
          ctx.strokeStyle = "#e2e8f0"
          ctx.lineWidth = 4
          ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

          // Add title
          ctx.fillStyle = "#2d3748"
          ctx.font = "bold 48px Arial"
          ctx.textAlign = "center"
          ctx.fillText("CERTIFICATE OF COMPLETION", canvas.width / 2, 120)

          resolve(null)
        } else {
          console.log("Loading custom background:", template.background_url)
          bgImg.src = template.background_url
        }
      })

      if (!template.background_url.includes("placeholder.svg")) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)
      }

      // Draw participant name at current position
      ctx.fillStyle = template.name_style.color
      const fontWeight = template.name_style.fontWeight || "bold"
      ctx.font = `${fontWeight} ${template.name_style.fontSize}px ${template.name_style.fontFamily}`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      console.log("Drawing name at current position:", template.name_position)
      ctx.fillText(previewData.name, template.name_position.x, template.name_position.y)

      // Draw QR code if available at current position
      if (qrCodeUrl) {
        const qrImg = new Image()
        qrImg.crossOrigin = "anonymous"

        await new Promise((resolve) => {
          qrImg.onload = () => {
            console.log("Drawing QR at current position:", template.qr_position)
            ctx.drawImage(
              qrImg,
              template.qr_position.x - qrSize / 2,
              template.qr_position.y - qrSize / 2,
              qrSize,
              qrSize,
            )
            resolve(null)
          }
          qrImg.src = qrCodeUrl
        })
      }

      // Download the image
      const link = document.createElement("a")
      link.download = `certificate-preview-${template.name}-${previewData.verificationId}.png`
      link.href = canvas.toDataURL("image/png", 1.0)
      link.click()

      setSuccess("Certificate image downloaded with current positions!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error generating image:", error)
      setError("Error generating certificate image. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  const downloadAsPDF = async () => {
    if (!template) {
      setError("No template selected. Please select a template first.")
      return
    }

    setGenerating(true)
    try {
      console.log("Generating PDF with current template positions:", {
        name: template.name_position,
        qr: template.qr_position,
      })

      const sampleParticipant = {
        id: "preview",
        name: previewData.name,
        email: "preview@example.com",
        college: previewData.college,
        role: previewData.role,
        verification_id: previewData.verificationId,
      }

      const pdfBlob = await generateCertificatePDF(sampleParticipant, template as any)
      downloadPDF(pdfBlob, `certificate-preview-${template.name}-${previewData.verificationId}.pdf`)

      setSuccess("Certificate PDF downloaded with current positions!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Error generating PDF:", error)
      setError("Error generating certificate PDF. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading preview...</p>
        </div>
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/admin/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!template) return null

  const width = template.template_width || 800
  const height = template.template_height || 600
  const qrSize = template.qr_size || 100
  const scaleX = previewSize.width / width
  const scaleY = previewSize.height / height

  const CertificatePreview = ({ className = "" }: { className?: string }) => (
    <div
      ref={previewRef}
      className={`relative bg-white border rounded-lg overflow-hidden cursor-crosshair ${className}`}
      style={{ aspectRatio: `${width}/${height}` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={template.background_url || "/placeholder.svg"}
        alt="Certificate background"
        className="w-full h-full object-contain pointer-events-none"
        crossOrigin="anonymous"
        draggable={false}
      />

      {/* Draggable Participant Name */}
      <div
        className="absolute cursor-move bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded px-2 py-1 hover:bg-opacity-30 transition-colors font-bold whitespace-nowrap"
        style={{
          left: `${(template.name_position.x / width) * 100}%`,
          top: `${(template.name_position.y / height) * 100}%`,
          fontSize: `${(template.name_style.fontSize / width) * 100}vw`,
          color: template.name_style.color,
          fontFamily: template.name_style.fontFamily,
          fontWeight: template.name_style.fontWeight || "bold",
          transform: "translate(-50%, -50%)",
          maxWidth: "80%",
        }}
        onMouseDown={(e) => handleMouseDown("name", e)}
      >
        {previewData.name}
      </div>

      {/* Draggable QR Code */}
      <div
        className="absolute cursor-move bg-green-500 bg-opacity-20 border-2 border-green-500 rounded flex items-center justify-center hover:bg-opacity-30 transition-colors"
        style={{
          left: `${(template.qr_position.x / width) * 100}%`,
          top: `${(template.qr_position.y / height) * 100}%`,
          width: `${(qrSize / width) * 100}%`,
          height: `${(qrSize / height) * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={(e) => handleMouseDown("qr", e)}
      >
        {qrCodeUrl ? (
          <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-full h-full object-contain rounded" />
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center text-white text-xs font-bold rounded">
            QR
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Certificate Preview</h1>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="mt-1 text-orange-600 border-orange-600">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            {hasUnsavedChanges && (
              <>
                <Button variant="outline" onClick={handleResetChanges}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleSaveChanges}>Save Changes</Button>
              </>
            )}
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview Controls */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Preview Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="preview-name">Participant Name</Label>
                <Input
                  id="preview-name"
                  value={previewData.name}
                  onChange={(e) => setPreviewData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name to preview"
                />
              </div>

              <div>
                <Label htmlFor="preview-role">Role</Label>
                <Input
                  id="preview-role"
                  value={previewData.role}
                  onChange={(e) => setPreviewData((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder="Enter role"
                />
              </div>

              <div>
                <Label htmlFor="preview-college">College/Institution</Label>
                <Input
                  id="preview-college"
                  value={previewData.college}
                  onChange={(e) => setPreviewData((prev) => ({ ...prev, college: e.target.value }))}
                  placeholder="Enter institution"
                />
              </div>

              <div>
                <Label htmlFor="preview-id">Verification ID</Label>
                <Input
                  id="preview-id"
                  value={previewData.verificationId}
                  onChange={(e) => setPreviewData((prev) => ({ ...prev, verificationId: e.target.value }))}
                  placeholder="Enter verification ID"
                />
              </div>

              <div>
                <Label htmlFor="template-select">Certificate Template</Label>
                <Select
                  value={template?.id || ""}
                  onValueChange={(templateId) => {
                    const selectedTemplate = availableTemplates.find((t) => t.id === templateId)
                    if (selectedTemplate) {
                      console.log("Switching to template:", selectedTemplate.name)
                      setTemplate(selectedTemplate)
                      setOriginalTemplate(JSON.parse(JSON.stringify(selectedTemplate)))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name} ({tmpl.template_width}×{tmpl.template_height})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position Controls */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Move className="h-4 w-4 mr-2" />
                  Position Controls
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Name Position</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <Label className="text-xs">X: {Math.round(template.name_position.x)}px</Label>
                        <Input
                          type="number"
                          value={Math.round(template.name_position.x)}
                          onChange={(e) =>
                            setTemplate((prev) => {
                              if (!prev) return prev
                              return {
                                ...prev,
                                name_position: { ...prev.name_position, x: Number(e.target.value) || 0 },
                              }
                            })
                          }
                          min="0"
                          max={width}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y: {Math.round(template.name_position.y)}px</Label>
                        <Input
                          type="number"
                          value={Math.round(template.name_position.y)}
                          onChange={(e) =>
                            setTemplate((prev) => {
                              if (!prev) return prev
                              return {
                                ...prev,
                                name_position: { ...prev.name_position, y: Number(e.target.value) || 0 },
                              }
                            })
                          }
                          min="0"
                          max={height}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-green-700">QR Code Position</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <Label className="text-xs">X: {Math.round(template.qr_position.x)}px</Label>
                        <Input
                          type="number"
                          value={Math.round(template.qr_position.x)}
                          onChange={(e) =>
                            setTemplate((prev) => {
                              if (!prev) return prev
                              return {
                                ...prev,
                                qr_position: { ...prev.qr_position, x: Number(e.target.value) || 0 },
                              }
                            })
                          }
                          min="0"
                          max={width}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y: {Math.round(template.qr_position.y)}px</Label>
                        <Input
                          type="number"
                          value={Math.round(template.qr_position.y)}
                          onChange={(e) =>
                            setTemplate((prev) => {
                              if (!prev) return prev
                              return {
                                ...prev,
                                qr_position: { ...prev.qr_position, y: Number(e.target.value) || 0 },
                              }
                            })
                          }
                          min="0"
                          max={height}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">QR Size: {qrSize}px</Label>
                    <Slider
                      value={[qrSize]}
                      onValueChange={(value) =>
                        setTemplate((prev) => {
                          if (!prev) return prev
                          return { ...prev, qr_size: value[0] }
                        })
                      }
                      min={50}
                      max={200}
                      step={10}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Font Size: {template.name_style.fontSize}px</Label>
                    <Slider
                      value={[template.name_style.fontSize]}
                      onValueChange={(value) =>
                        setTemplate((prev) => {
                          if (!prev) return prev
                          return {
                            ...prev,
                            name_style: { ...prev.name_style, fontSize: value[0] },
                          }
                        })
                      }
                      min={16}
                      max={72}
                      step={2}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Text Color</Label>
                    <Input
                      type="color"
                      value={template.name_style.color}
                      onChange={(e) =>
                        setTemplate((prev) => {
                          if (!prev) return prev
                          return {
                            ...prev,
                            name_style: { ...prev.name_style, color: e.target.value },
                          }
                        })
                      }
                      className="h-8 mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Template Info</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <strong>Name:</strong> {template?.name}
                  </p>
                  <p>
                    <strong>Size:</strong> {width} × {height}px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Live Preview</CardTitle>
              <div className="flex space-x-2">
                <Dialog open={fullscreen} onOpenChange={setFullscreen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Fullscreen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] p-4">
                    <DialogHeader>
                      <DialogTitle>Certificate Preview</DialogTitle>
                      <DialogDescription>Full-size certificate preview - drag elements to reposition</DialogDescription>
                    </DialogHeader>
                    <CertificatePreview className="w-full max-h-[80vh]" />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <CertificatePreview className="w-full" />

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Current Positions</h3>
                  <p>
                    <strong>Name:</strong> X: {Math.round(template.name_position.x)}px, Y:{" "}
                    {Math.round(template.name_position.y)}px
                  </p>
                  <p>
                    <strong>QR Code:</strong> X: {Math.round(template.qr_position.x)}px, Y:{" "}
                    {Math.round(template.qr_position.y)}px
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Drag the blue box (name) and green box (QR) to reposition
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Download Actions</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`/verify/${previewData.verificationId}`, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Test Verification Page
                    </Button>
                    <Button size="sm" className="w-full" onClick={downloadAsImage} disabled={generating}>
                      {generating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download as PNG
                    </Button>
                    <Button
                      size="sm"
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={downloadAsPDF}
                      disabled={generating}
                    >
                      {generating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download as PDF
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
