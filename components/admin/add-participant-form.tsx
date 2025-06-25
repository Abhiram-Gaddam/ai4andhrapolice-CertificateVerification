"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

export default function AddParticipantForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    college: "",
    role: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error("Name is required")
      }

      // Generate unique verification ID
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase()
      const verificationId = `CERT-${new Date().getFullYear()}-${randomSuffix}`

      // Insert participant (without event field)
      const { data: insertedParticipant, error: insertError } = await supabase
        .from("participants")
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          college: formData.college.trim() || null,
          role: formData.role || null,
          verification_id: verificationId,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Log the manual entry
      if (insertedParticipant) {
        await supabase.from("certificate_logs").insert({
          participant_id: insertedParticipant.id,
          generation_type: "manual",
          status: "pending",
        })
      }

      setSuccess(true)
      setFormData({
        name: "",
        email: "",
        college: "",
        role: "",
      })

      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)
    } catch (err: any) {
      console.error("Error adding participant:", err)
      setError(err.message || "Error adding participant")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>Participant added successfully!</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
            placeholder="Enter full name"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Enter email address"
          />
        </div>

        <div>
          <Label htmlFor="college">College/Institution</Label>
          <Input
            id="college"
            value={formData.college}
            onChange={(e) => setFormData((prev) => ({ ...prev, college: e.target.value }))}
            placeholder="Enter institution name"
          />
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Participant">Participant</SelectItem>
              <SelectItem value="Speaker">Speaker</SelectItem>
              <SelectItem value="Organizer">Organizer</SelectItem>
              <SelectItem value="Volunteer">Volunteer</SelectItem>
              <SelectItem value="Mentor">Mentor</SelectItem>
              <SelectItem value="Judge">Judge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Adding Participant..." : "Add Participant"}
      </Button>
    </form>
  )
}
