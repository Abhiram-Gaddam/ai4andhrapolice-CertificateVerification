"use client"
import LivePreview from "@/components/admin/live-preview"

interface Template {
  id: string
  name: string
  background_url: string
  name_position: { x: number; y: number }
  qr_position: { x: number; y: number }
  name_style: { fontSize: number; color: string; fontFamily: string }
}

export default function PreviewPage() {
  return <LivePreview />
}
