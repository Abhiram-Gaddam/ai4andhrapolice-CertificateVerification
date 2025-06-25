"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, User, Mail, GraduationCap, Award, Download, Share2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Participant {
  id: string
  name: string
  email: string
  college: string
  role: string
  verification_id: string
  certificate_url: string | null
  created_at: string
}

export default function VerificationPage() {
  const params = useParams()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [scanLogged, setScanLogged] = useState(false)

  useEffect(() => {
    if (params.id) {
      verifyParticipant(params.id as string)
    }
  }, [params.id])

  const verifyParticipant = async (verificationId: string) => {
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("verification_id", verificationId)
        .single()

      if (error) throw error
      setParticipant(data)

      // Log the scan
      if (!scanLogged) {
        await logScan(data.id)
        setScanLogged(true)
      }
    } catch (err) {
      setError("Certificate not found or invalid verification ID")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const logScan = async (participantId: string) => {
    try {
      await supabase.from("qr_scan_logs").insert({
        participant_id: participantId,
        ip_address: "0.0.0.0", // In a real app, you'd get the actual IP
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      })
    } catch (err) {
      console.error("Error logging scan:", err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate Verification - ${participant?.name}`,
          text: `Verify ${participant?.name}'s certificate`,
          url: window.location.href,
        })
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert("Verification link copied to clipboard!")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Verifying Certificate</h3>
              <p className="text-gray-500">Please wait while we validate the certificate...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-700">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                <strong>Possible reasons:</strong>
              </p>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• Invalid or expired verification ID</li>
                <li>• Certificate has been revoked</li>
                <li>• Incorrect QR code or link</li>
              </ul>
            </div>
            <p className="text-sm text-gray-500">
              Please check the QR code or verification link and try again. If the problem persists, contact the
              certificate issuer.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl border-green-200 shadow-xl">
        <CardHeader className="text-center pb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
          <div className="mx-auto mb-6 p-4 bg-green-100 rounded-full w-fit">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-3xl text-green-700 mb-2">Certificate Verified ✓</CardTitle>
          <p className="text-gray-600 text-lg">This certificate has been successfully verified and is authentic</p>
        </CardHeader>

        <CardContent className="p-8">
          {/* Participant Information */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">{participant.name}</h2>
            <div className="flex justify-center items-center space-x-4 mb-4">
              <Badge variant="default" className="text-lg px-6 py-2 bg-blue-600">
                {participant.role}
              </Badge>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-xl border">
              <div className="p-3 bg-blue-100 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Participant Name</p>
                <p className="text-lg font-semibold text-gray-900">{participant.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-xl border">
              <div className="p-3 bg-purple-100 rounded-full">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email Address</p>
                <p className="text-lg font-semibold text-gray-900">{participant.email || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-xl border">
              <div className="p-3 bg-green-100 rounded-full">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Institution</p>
                <p className="text-lg font-semibold text-gray-900">{participant.college || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-xl border">
              <div className="p-3 bg-orange-100 rounded-full">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Role</p>
                <p className="text-lg font-semibold text-gray-900">{participant.role}</p>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="text-center p-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-blue-200 mb-6">
            <div className="flex justify-center items-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-2xl font-bold text-blue-800">Verified by Certificate Generator System</h3>
            </div>
            <p className="text-blue-700 text-lg mb-3">This certificate is authentic and has been digitally verified</p>
            <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="font-medium">Verification ID:</span>
                <code className="ml-2 px-2 py-1 bg-white rounded border font-mono">{participant.verification_id}</code>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Verified on:</span>
                <span className="ml-2">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <Button onClick={handleShare} variant="outline" className="flex items-center space-x-2">
              <Share2 className="h-4 w-4" />
              <span>Share Verification</span>
            </Button>
            {participant.certificate_url && (
              <Button className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download Certificate</span>
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              This verification page was generated automatically and is valid as of {new Date().toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
