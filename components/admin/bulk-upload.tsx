"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"

interface ParticipantData {
  name: string
  email: string
  college: string
  role: string
  event: string
  verificationId?: string
}

interface UploadResult {
  success: number
  failed: number
  errors: string[]
  duplicates: number
}

export default function BulkUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      setError("")
      setSuccess("")
      setUploadResult(null)
      parseExcelFile(uploadedFile)
    }
  }

  const parseExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        if (jsonData.length === 0) {
          setError("The Excel file appears to be empty or has no valid data.")
          return
        }

        const parsedParticipants: ParticipantData[] = jsonData.map((row, index) => {
          // Handle different possible column names (case insensitive)
          const getName = (row: any) => {
            return row.Name || row.name || row.NAME || row["Full Name"] || row["full name"] || ""
          }

          const getEmail = (row: any) => {
            return row.Email || row.email || row.EMAIL || row["Email Address"] || row["email address"] || ""
          }

          const getCollege = (row: any) => {
            return (
              row.College ||
              row.college ||
              row.COLLEGE ||
              row.Institution ||
              row.institution ||
              row.University ||
              row.university ||
              ""
            )
          }

          const getRole = (row: any) => {
            return row.Role || row.role || row.ROLE || row.Position || row.position || "Participant"
          }

          const getEvent = (row: any) => {
            return row.Event || row.event || row.EVENT || row["Event Name"] || row["event name"] || ""
          }

          return {
            name: getName(row).toString().trim(),
            email: getEmail(row).toString().trim(),
            college: getCollege(row).toString().trim(),
            role: getRole(row).toString().trim(),
            event: getEvent(row).toString().trim(),
            verificationId: row["Verification ID"] || row.verificationId || `CERT-${Date.now()}-${index + 1}`,
          }
        })

        // Filter out rows with empty names
        const validParticipants = parsedParticipants.filter((p) => p.name && p.name.length > 0)

        if (validParticipants.length === 0) {
          setError("No valid participants found. Please ensure the Excel file has a 'Name' column with data.")
          return
        }

        setParticipants(validParticipants)
        setSuccess(`Successfully parsed ${validParticipants.length} participants from the Excel file.`)
        setError("")
      } catch (err) {
        console.error("Excel parsing error:", err)
        setError("Error parsing Excel file. Please check the format and try again.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const generateUniqueVerificationId = async (baseName: string, index: number): Promise<string> => {
    const timestamp = Date.now()
    const namePrefix = baseName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase()
    let verificationId = `CERT-${new Date().getFullYear()}-${namePrefix}-${timestamp}-${index + 1}`

    // Check if this ID already exists and generate a new one if needed
    let attempts = 0
    while (attempts < 5) {
      const { data } = await supabase
        .from("participants")
        .select("verification_id")
        .eq("verification_id", verificationId)
        .single()

      if (!data) {
        // ID is unique
        break
      }

      // Generate a new ID
      attempts++
      verificationId = `CERT-${new Date().getFullYear()}-${namePrefix}-${timestamp}-${index + 1}-${attempts}`
    }

    return verificationId
  }

  const handleBulkUpload = async () => {
    if (participants.length === 0) {
      setError("No participants to upload")
      return
    }

    setUploading(true)
    setProgress(0)
    setError("")
    setSuccess("")

    const result: UploadResult = {
      success: 0,
      failed: 0,
      errors: [],
      duplicates: 0,
    }

    try {
      console.log(`Starting bulk upload of ${participants.length} participants...`)

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i]

        try {
          // Validate required fields
          if (!participant.name || participant.name.trim().length === 0) {
            result.failed++
            result.errors.push(`Row ${i + 1}: Name is required`)
            continue
          }

          // Generate unique verification ID
          const verificationId = await generateUniqueVerificationId(participant.name, i)

          // Check for existing participant by email (if provided) or name
          let existingParticipant = null
          if (participant.email && participant.email.trim().length > 0) {
            const { data } = await supabase
              .from("participants")
              .select("id, name, email")
              .eq("email", participant.email.trim())
              .single()
            existingParticipant = data
          }

          if (existingParticipant) {
            result.duplicates++
            result.errors.push(`Row ${i + 1}: Participant with email ${participant.email} already exists`)
            setProgress(((i + 1) / participants.length) * 100)
            continue
          }

          // Insert participant into database
          const { data: insertedParticipant, error: insertError } = await supabase
            .from("participants")
            .insert({
              name: participant.name.trim(),
              email: participant.email.trim() || null,
              college: participant.college.trim() || null,
              role: participant.role.trim() || "Participant",
              verification_id: verificationId,
            })
            .select()
            .single()

          if (insertError) {
            console.error(`Error inserting participant ${participant.name}:`, insertError)
            result.failed++
            result.errors.push(`Row ${i + 1}: ${insertError.message}`)
            continue
          }

          // Log the bulk upload entry
          if (insertedParticipant) {
            await supabase.from("certificate_logs").insert({
              participant_id: insertedParticipant.id,
              generation_type: "bulk",
              status: "pending",
            })
          }

          result.success++
          console.log(`Successfully uploaded participant ${i + 1}/${participants.length}: ${participant.name}`)
        } catch (participantError: any) {
          console.error(`Error processing participant ${participant.name}:`, participantError)
          result.failed++
          result.errors.push(`Row ${i + 1}: ${participantError.message || "Unknown error"}`)
        }

        // Update progress
        setProgress(((i + 1) / participants.length) * 100)
      }

      // Set final results
      setUploadResult(result)

      if (result.success > 0) {
        setSuccess(
          `Upload completed! Successfully uploaded ${result.success} participants.${
            result.failed > 0 ? ` ${result.failed} failed.` : ""
          }${result.duplicates > 0 ? ` ${result.duplicates} duplicates skipped.` : ""}`,
        )
      }

      if (result.failed > 0 || result.duplicates > 0) {
        setError(
          `Some issues occurred during upload. ${result.failed} failed, ${result.duplicates} duplicates. Check the details below.`,
        )
      }

      // Clear the form if all successful
      if (result.failed === 0 && result.duplicates === 0) {
        setFile(null)
        setParticipants([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    } catch (err: any) {
      console.error("Bulk upload error:", err)
      setError(`Bulk upload failed: ${err.message || "Unknown error"}`)
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        Name: "John Doe",
        Email: "john@example.com",
        College: "ABC University",
        Role: "Participant",
        Event: "Tech Conference 2024",
      },
      {
        Name: "Jane Smith",
        Email: "jane@example.com",
        College: "XYZ Institute",
        Role: "Speaker",
        Event: "Tech Conference 2024",
      },
      {
        Name: "Bob Johnson",
        Email: "bob@example.com",
        College: "DEF College",
        Role: "Organizer",
        Event: "Tech Conference 2024",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Participants")
    XLSX.writeFile(wb, "participant_template.xlsx")
  }

  const resetUpload = () => {
    setFile(null)
    setParticipants([])
    setError("")
    setSuccess("")
    setUploadResult(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Participants</CardTitle>
          <p className="text-sm text-gray-600">
            Upload multiple participants at once using an Excel file. Supported columns: Name (required), Email,
            College, Role, Event
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Excel File Upload</Label>
              <p className="text-sm text-gray-500">Upload an Excel file with participant data</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              {(file || participants.length > 0) && (
                <Button variant="outline" onClick={resetUpload} disabled={uploading}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Excel File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {file && <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>}
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: .xlsx, .xls | Required column: Name | Optional: Email, College, Role, Event
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {participants.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Parsed Participants ({participants.length})
                  {uploadResult && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      (✅ {uploadResult.success} success, ❌ {uploadResult.failed} failed, 🔄 {uploadResult.duplicates}{" "}
                      duplicates)
                    </span>
                  )}
                </h3>
                <Button onClick={handleBulkUpload} disabled={uploading} className="bg-green-600 hover:bg-green-700">
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload All to Database
                    </>
                  )}
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-gray-600 text-center">Uploading participants... {Math.round(progress)}%</p>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">College</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.slice(0, 20).map((participant, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 font-medium">
                          {participant.name || <span className="text-red-500">Missing Name</span>}
                        </td>
                        <td className="px-4 py-2">{participant.email || "—"}</td>
                        <td className="px-4 py-2">{participant.college || "—"}</td>
                        <td className="px-4 py-2">{participant.role || "Participant"}</td>
                        <td className="px-4 py-2">{participant.event || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {participants.length > 20 && (
                  <p className="text-center py-2 text-gray-500">... and {participants.length - 20} more</p>
                )}
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Upload Results</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">{uploadResult.success}</p>
                    <p className="text-sm text-green-600">Successfully Uploaded</p>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-700">{uploadResult.failed}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-700">{uploadResult.duplicates}</p>
                    <p className="text-sm text-yellow-600">Duplicates Skipped</p>
                  </CardContent>
                </Card>
              </div>

              {uploadResult.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-700">Errors and Issues:</h4>
                  <div className="max-h-32 overflow-y-auto bg-red-50 border border-red-200 rounded p-3">
                    {uploadResult.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-700 mb-1">
                        • {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
