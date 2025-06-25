"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, Download, FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"

interface ParticipantData {
  name: string
  email: string
  college: string
  role: string
  event: string
  verificationId?: string
}

export default function BulkUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile) {
      setFile(uploadedFile)
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

        const parsedParticipants: ParticipantData[] = jsonData.map((row, index) => ({
          name: row.Name || row.name || "",
          email: row.Email || row.email || "",
          college: row.College || row.college || "",
          role: row.Role || row.role || "",
          event: row.Event || row.event || "",
          verificationId: row["Verification ID"] || row.verificationId || `CERT-${Date.now()}-${index}`,
        }))

        setParticipants(parsedParticipants)
        setError("")
      } catch (err) {
        setError("Error parsing Excel file. Please check the format.")
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleBulkUpload = async () => {
    if (participants.length === 0) {
      setError("No participants to upload")
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      // Simulate upload progress
      for (let i = 0; i < participants.length; i++) {
        // Here you would make API calls to save each participant
        await new Promise((resolve) => setTimeout(resolve, 100))
        setProgress(((i + 1) / participants.length) * 100)
      }

      setError("")
      alert("Participants uploaded successfully!")
    } catch (err) {
      setError("Error uploading participants")
      console.error(err)
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
        "Verification ID": "CERT-001",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Participants")
    XLSX.writeFile(wb, "participant_template.xlsx")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Participants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Excel File Upload</Label>
              <p className="text-sm text-gray-500">Upload an Excel file with participant data</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {participants.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Parsed Participants ({participants.length})</h3>
                <Button onClick={handleBulkUpload} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload All"}
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-gray-600 text-center">Uploading... {Math.round(progress)}%</p>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">College</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.slice(0, 10).map((participant, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{participant.name}</td>
                        <td className="px-4 py-2">{participant.email}</td>
                        <td className="px-4 py-2">{participant.college}</td>
                        <td className="px-4 py-2">{participant.role}</td>
                        <td className="px-4 py-2">{participant.event}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {participants.length > 10 && (
                  <p className="text-center py-2 text-gray-500">... and {participants.length - 10} more</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
