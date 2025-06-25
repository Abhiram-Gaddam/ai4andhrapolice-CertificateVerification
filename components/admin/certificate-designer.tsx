"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Upload, Save, Eye, Download, Trash2, Edit, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateCertificatePDF, downloadPDF } from "@/lib/pdf-generator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Position {
  x: number
  y: number
}

interface TextStyle {
  fontSize: number
  color: string
  fontFamily: string
  fontWeight: string
}

interface Template {
  id?: string
  name: string
  background_url: string
  name_position: Position
  qr_position: Position
  name_style: TextStyle
  qr_size: number
  template_width: number
  template_height: number
  created_at?: string
}

export default function CertificateDesigner() {
  const [template, setTemplate] = useState<Template>({
    name: "",
    background_url: "",
    name_position: { x: 400, y: 300 },
    qr_position: { x: 650, y: 500 },
    name_style: {
      fontSize: 36,
      color: "#1a365d",
      fontFamily: "Georgia",
      fontWeight: "bold",
    },
    qr_size: 100,
    template_width: 800,
    template_height: 600,
  })

  const [savedTemplates, setSavedTemplates] = useState<Template[]>([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [draggedElement, setDraggedElement] = useState<"name" | "qr" | null>(null)
  const [previewSize, setPreviewSize] = useState({ width: 800, height: 600 })
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePreviewSize = () => {
      if (previewRef.current) {
        const containerWidth = previewRef.current.clientWidth
        const aspectRatio = template.template_height / template.template_width
        const newWidth = Math.min(containerWidth - 40, 800)
        const newHeight = newWidth * aspectRatio
        setPreviewSize({ width: newWidth, height: newHeight })
      }
    }

    updatePreviewSize()
    window.addEventListener("resize", updatePreviewSize)
    return () => window.removeEventListener("resize", updatePreviewSize)
  }, [template.template_width, template.template_height])

  useEffect(() => {
    fetchSavedTemplates()
  }, [])

  const fetchSavedTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSavedTemplates(data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          console.log("Image loaded:", { width: img.width, height: img.height })
          setTemplate((prev) => ({
            ...prev,
            background_url: e.target?.result as string,
            template_width: img.width,
            template_height: img.height,
            // Adjust positions to be within new dimensions
            name_position: {
              x: Math.min(prev.name_position.x, img.width - 50),
              y: Math.min(prev.name_position.y, img.height - 50),
            },
            qr_position: {
              x: Math.min(prev.qr_position.x, img.width - 50),
              y: Math.min(prev.qr_position.y, img.height - 50),
            },
          }))
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMouseDown = (element: "name" | "qr", event: React.MouseEvent) => {
    event.preventDefault()
    setDraggedElement(element)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!draggedElement || !previewRef.current) return

    const rect = previewRef.current.getBoundingClientRect()
    const scaleX = template.template_width / previewSize.width
    const scaleY = template.template_height / previewSize.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    if (draggedElement === "name") {
      setTemplate((prev) => ({
        ...prev,
        name_position: {
          x: Math.max(50, Math.min(x, template.template_width - 50)),
          y: Math.max(50, Math.min(y, template.template_height - 50)),
        },
      }))
    } else if (draggedElement === "qr") {
      setTemplate((prev) => ({
        ...prev,
        qr_position: {
          x: Math.max(template.qr_size / 2, Math.min(x, template.template_width - template.qr_size / 2)),
          y: Math.max(template.qr_size / 2, Math.min(y, template.template_height - template.qr_size / 2)),
        },
      }))
    }
  }

  const handleMouseUp = () => {
    setDraggedElement(null)
  }

  const handleSaveTemplate = async () => {
    if (!template.name || !template.background_url) {
      setError("Please provide template name and background image")
      return
    }

    setSaving(true)
    setError("")

    try {
      console.log("Saving template with positions:", {
        name: template.name_position,
        qr: template.qr_position,
        dimensions: { width: template.template_width, height: template.template_height },
      })

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from("certificate_templates")
          .update({
            name: template.name,
            background_url: template.background_url,
            name_position: template.name_position,
            qr_position: template.qr_position,
            name_style: template.name_style,
            qr_size: template.qr_size,
            template_width: template.template_width,
            template_height: template.template_height,
          })
          .eq("id", editingTemplate)

        if (error) throw error
        setSuccess("Template updated successfully!")
        setEditingTemplate(null)
      } else {
        // Create new template
        const { error } = await supabase.from("certificate_templates").insert({
          name: template.name,
          background_url: template.background_url,
          name_position: template.name_position,
          qr_position: template.qr_position,
          name_style: template.name_style,
          qr_size: template.qr_size,
          template_width: template.template_width,
          template_height: template.template_height,
        })

        if (error) throw error
        setSuccess("Template saved successfully!")
      }

      fetchSavedTemplates()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Error saving template")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(templateId)
    setError("")

    try {
      const { error } = await supabase.from("certificate_templates").delete().eq("id", templateId)

      if (error) throw error

      setSuccess(`Template "${templateName}" deleted successfully!`)
      fetchSavedTemplates()
      setTimeout(() => setSuccess(""), 3000)

      // If we're editing the deleted template, reset the form
      if (editingTemplate === templateId) {
        handleNewTemplate()
      }
    } catch (err: any) {
      setError(err.message || "Error deleting template")
    } finally {
      setDeleting(null)
    }
  }

  const handleLoadTemplate = (savedTemplate: Template) => {
    setTemplate({
      ...savedTemplate,
      id: savedTemplate.id,
    })
    setEditingTemplate(savedTemplate.id || null)
    setTemplatesDialogOpen(false)
    setSuccess(`Loaded template "${savedTemplate.name}" for editing`)
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleNewTemplate = () => {
    setTemplate({
      name: "",
      background_url: "",
      name_position: { x: 400, y: 300 },
      qr_position: { x: 650, y: 500 },
      name_style: {
        fontSize: 36,
        color: "#1a365d",
        fontFamily: "Georgia",
        fontWeight: "bold",
      },
      qr_size: 100,
      template_width: 800,
      template_height: 600,
    })
    setEditingTemplate(null)
  }

  const handleGeneratePreview = async () => {
    if (!template.background_url) {
      setError("Please upload a background image first")
      return
    }

    setGenerating(true)
    setError("")

    try {
      const sampleParticipant = {
        id: "sample",
        name: "John Doe",
        email: "john@example.com",
        college: "Sample University",
        role: "Participant",
        verification_id: "SAMPLE-001",
      }

      console.log("Generating preview with current template settings")
      const pdfBlob = await generateCertificatePDF(sampleParticipant, template as any)
      downloadPDF(pdfBlob, `preview-certificate-${Date.now()}.pdf`)

      setSuccess("Preview certificate generated successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      console.error("Preview generation error:", err)
      setError(err.message || "Error generating preview")
    } finally {
      setGenerating(false)
    }
  }

  const scaleX = previewSize.width / template.template_width
  const scaleY = previewSize.height / template.template_height

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Design Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {editingTemplate ? "Edit Template" : "Create New Template"}
            {editingTemplate && (
              <Badge variant="outline" className="ml-2">
                Editing
              </Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Manage Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Saved Templates</DialogTitle>
                  <DialogDescription>Load, edit, or delete your saved certificate templates</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {savedTemplates.map((savedTemplate) => (
                    <Card key={savedTemplate.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{savedTemplate.name}</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(savedTemplate.id!, savedTemplate.name)}
                            disabled={deleting === savedTemplate.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            {deleting === savedTemplate.id ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></div>
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p>
                            <strong>Size:</strong> {savedTemplate.template_width} × {savedTemplate.template_height}px
                          </p>
                          <p>
                            <strong>Font:</strong> {savedTemplate.name_style.fontFamily},{" "}
                            {savedTemplate.name_style.fontSize}px
                          </p>
                          <p>
                            <strong>Created:</strong> {new Date(savedTemplate.created_at!).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadTemplate(savedTemplate)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {savedTemplates.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <p>No saved templates found</p>
                      <p className="text-sm">Create your first template to get started</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            {editingTemplate && (
              <Button variant="outline" size="sm" onClick={handleNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={template.name}
              onChange={(e) => setTemplate((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter template name"
            />
          </div>

          <div>
            <Label>Background Template</Label>
            <div className="mt-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Background Image (PNG/JPG)
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            {template.background_url && (
              <p className="text-sm text-gray-600 mt-2">
                Template size: {template.template_width} × {template.template_height} pixels
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Name Positioning</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>X Position (px)</Label>
                <Input
                  type="number"
                  value={template.name_position.x}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      name_position: { ...prev.name_position, x: Number.parseInt(e.target.value) || 0 },
                    }))
                  }
                  min="0"
                  max={template.template_width}
                />
              </div>
              <div>
                <Label>Y Position (px)</Label>
                <Input
                  type="number"
                  value={template.name_position.y}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      name_position: { ...prev.name_position, y: Number.parseInt(e.target.value) || 0 },
                    }))
                  }
                  min="0"
                  max={template.template_height}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">QR Code Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>X Position (px)</Label>
                <Input
                  type="number"
                  value={template.qr_position.x}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      qr_position: { ...prev.qr_position, x: Number.parseInt(e.target.value) || 0 },
                    }))
                  }
                  min="0"
                  max={template.template_width}
                />
              </div>
              <div>
                <Label>Y Position (px)</Label>
                <Input
                  type="number"
                  value={template.qr_position.y}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      qr_position: { ...prev.qr_position, y: Number.parseInt(e.target.value) || 0 },
                    }))
                  }
                  min="0"
                  max={template.template_height}
                />
              </div>
            </div>
            <div>
              <Label>QR Code Size: {template.qr_size}px</Label>
              <Slider
                value={[template.qr_size]}
                onValueChange={(value) => setTemplate((prev) => ({ ...prev, qr_size: value[0] }))}
                min={50}
                max={200}
                step={10}
                className="mt-2"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Text Styling</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Font Size: {template.name_style.fontSize}px</Label>
                <Slider
                  value={[template.name_style.fontSize]}
                  onValueChange={(value) =>
                    setTemplate((prev) => ({
                      ...prev,
                      name_style: { ...prev.name_style, fontSize: value[0] },
                    }))
                  }
                  min={16}
                  max={72}
                  step={2}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Font Family</Label>
                <Select
                  value={template.name_style.fontFamily}
                  onValueChange={(value) =>
                    setTemplate((prev) => ({
                      ...prev,
                      name_style: { ...prev.name_style, fontFamily: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Font Weight</Label>
                <Select
                  value={template.name_style.fontWeight}
                  onValueChange={(value) =>
                    setTemplate((prev) => ({
                      ...prev,
                      name_style: { ...prev.name_style, fontWeight: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="bolder">Bolder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Text Color</Label>
                <Input
                  type="color"
                  value={template.name_style.color}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      name_style: { ...prev.name_style, color: e.target.value },
                    }))
                  }
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={handleSaveTemplate} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
            </Button>
            <Button variant="outline" onClick={() => window.open("/preview", "_blank")}>
              <Eye className="h-4 w-4 mr-2" />
              Live Preview
            </Button>
            <Button variant="outline" onClick={handleGeneratePreview} disabled={generating}>
              {generating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Test PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Preview Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Preview</CardTitle>
          <p className="text-sm text-gray-600">Drag elements to reposition them</p>
        </CardHeader>
        <CardContent>
          <div
            ref={previewRef}
            className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 cursor-crosshair"
            style={{
              width: "100%",
              height: `${previewSize.height}px`,
              minHeight: "400px",
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {template.background_url ? (
              <>
                <img
                  src={template.background_url || "/placeholder.svg"}
                  alt="Certificate background"
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />

                {/* Draggable Name Element */}
                <div
                  className="absolute cursor-move bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded px-2 py-1 hover:bg-opacity-30 transition-colors"
                  style={{
                    left: `${template.name_position.x * scaleX}px`,
                    top: `${template.name_position.y * scaleY}px`,
                    fontSize: `${template.name_style.fontSize * scaleY}px`,
                    color: template.name_style.color,
                    fontFamily: template.name_style.fontFamily,
                    fontWeight: template.name_style.fontWeight,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseDown={(e) => handleMouseDown("name", e)}
                >
                  John Doe
                </div>

                {/* Draggable QR Code Element */}
                <div
                  className="absolute cursor-move bg-green-500 bg-opacity-20 border-2 border-green-500 rounded flex items-center justify-center text-white font-bold hover:bg-opacity-30 transition-colors"
                  style={{
                    left: `${template.qr_position.x * scaleX}px`,
                    top: `${template.qr_position.y * scaleY}px`,
                    width: `${template.qr_size * scaleX}px`,
                    height: `${template.qr_size * scaleY}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseDown={(e) => handleMouseDown("qr", e)}
                >
                  <div className="bg-black text-white text-xs p-1 rounded">QR</div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload a background image to start designing</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p>
              <strong>Name Position:</strong> X: {Math.round(template.name_position.x)}px, Y:{" "}
              {Math.round(template.name_position.y)}px
            </p>
            <p>
              <strong>QR Position:</strong> X: {Math.round(template.qr_position.x)}px, Y:{" "}
              {Math.round(template.qr_position.y)}px
            </p>
            <p>
              <strong>Font:</strong> {template.name_style.fontFamily}, {template.name_style.fontSize}px,{" "}
              {template.name_style.fontWeight}
            </p>
            <p className="text-xs text-gray-500">
              💡 Tip: Drag the blue box (name) and green box (QR code) to reposition them
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
