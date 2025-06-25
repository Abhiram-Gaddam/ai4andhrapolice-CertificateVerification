import jsPDF from "jspdf"
import { generateHighResQRCode, getVerificationURL } from "./qr-generator"

// Safe font mapping for jsPDF
const FONT_MAPPING: Record<string, string> = {
  Arial: "helvetica",
  Georgia: "times",
  "Times New Roman": "times",
  Helvetica: "helvetica",
  Verdana: "helvetica",
  "sans-serif": "helvetica",
  serif: "times",
}

export interface CertificateTemplate {
  id: string
  name: string
  background_url: string
  name_position: { x: number; y: number }
  qr_position: { x: number; y: number }
  name_style: {
    fontSize: number
    color: string
    fontFamily: string
    fontWeight?: string
  }
  qr_size?: number
  template_width?: number
  template_height?: number
}

export interface ParticipantData {
  id: string
  name: string
  email?: string
  college?: string
  role?: string
  verification_id: string
}

export const generateCertificatePDF = async (
  participant: ParticipantData,
  template: CertificateTemplate,
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Generating PDF with template:", {
        name: template.name,
        dimensions: { width: template.template_width, height: template.template_height },
        namePosition: template.name_position,
        qrPosition: template.qr_position,
        qrSize: template.qr_size,
      })

      // Use template dimensions or safe defaults
      const width = template.template_width || 800
      const height = template.template_height || 600
      const qrSize = template.qr_size || 100

      // Create PDF with exact template dimensions (convert to mm)
      const pdfWidth = width * 0.264583 // px to mm conversion
      const pdfHeight = height * 0.264583

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      })

      console.log("PDF dimensions:", {
        pdfWidth,
        pdfHeight,
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
      })

      // Load background image
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = async () => {
        try {
          console.log("Background image loaded successfully")

          // Create canvas with exact template dimensions
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")!
          canvas.width = width
          canvas.height = height

          // Draw background image to fill entire canvas
          ctx.drawImage(img, 0, 0, width, height)
          const backgroundDataURL = canvas.toDataURL("image/jpeg", 1.0)

          // Add background to PDF
          pdf.addImage(backgroundDataURL, "JPEG", 0, 0, pdfWidth, pdfHeight)
          console.log("Background added to PDF")

          // Generate high-resolution QR code
          const verificationURL = getVerificationURL(participant.verification_id)
          console.log("Generating QR code for:", verificationURL)
          const qrCodeDataURL = await generateHighResQRCode(verificationURL, qrSize * 3)

          // Add QR code at exact position from template
          const qrSizeMM = qrSize * 0.264583
          const qrXMM = template.qr_position.x * 0.264583
          const qrYMM = template.qr_position.y * 0.264583

          console.log("QR code position (mm):", { x: qrXMM, y: qrYMM, size: qrSizeMM })
          console.log("QR code position (px):", { x: template.qr_position.x, y: template.qr_position.y, size: qrSize })

          // Position QR code with center alignment
          pdf.addImage(qrCodeDataURL, "PNG", qrXMM - qrSizeMM / 2, qrYMM - qrSizeMM / 2, qrSizeMM, qrSizeMM)

          // Add participant name at exact position from template
          const fontFamily = FONT_MAPPING[template.name_style.fontFamily] || "helvetica"
          pdf.setFont(fontFamily)
          pdf.setFontSize(template.name_style.fontSize * 0.75) // Adjust for PDF scaling
          pdf.setTextColor(template.name_style.color)

          const nameXMM = template.name_position.x * 0.264583
          const nameYMM = template.name_position.y * 0.264583

          console.log("Name position (mm):", { x: nameXMM, y: nameYMM })
          console.log("Name position (px):", { x: template.name_position.x, y: template.name_position.y })
          console.log("Font settings:", {
            family: fontFamily,
            size: template.name_style.fontSize * 0.75,
            color: template.name_style.color,
          })

          // Center the text horizontally at the specified position
          const textWidth = pdf.getTextWidth(participant.name)
          pdf.text(participant.name, nameXMM - textWidth / 2, nameYMM)

          console.log("Certificate generated successfully for:", participant.name)

          // Generate PDF blob
          const pdfBlob = pdf.output("blob")
          resolve(pdfBlob)
        } catch (error) {
          console.error("Error during PDF generation:", error)
          reject(error)
        }
      }

      img.onerror = (error) => {
        console.error("Failed to load background image:", error)
        reject(new Error("Failed to load background image"))
      }

      // Handle different image sources
      if (template.background_url.includes("placeholder.svg")) {
        console.log("Using placeholder background")
        // Create a professional certificate background
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        canvas.width = width
        canvas.height = height

        // Create elegant gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        gradient.addColorStop(0, "#f8fafc")
        gradient.addColorStop(0.5, "#ffffff")
        gradient.addColorStop(1, "#f1f5f9")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Add decorative border
        ctx.strokeStyle = "#e2e8f0"
        ctx.lineWidth = 8
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80)

        // Add inner border
        ctx.strokeStyle = "#cbd5e1"
        ctx.lineWidth = 2
        ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120)

        // Add certificate title
        ctx.fillStyle = "#1e293b"
        ctx.font = "bold 48px serif"
        ctx.textAlign = "center"
        ctx.fillText("CERTIFICATE OF COMPLETION", canvas.width / 2, 150)

        // Add decorative line
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(canvas.width / 2 - 200, 180)
        ctx.lineTo(canvas.width / 2 + 200, 180)
        ctx.stroke()

        const backgroundDataURL = canvas.toDataURL("image/jpeg", 1.0)
        img.src = backgroundDataURL
      } else {
        console.log("Loading custom background image:", template.background_url)
        img.src = template.background_url
      }
    } catch (error) {
      console.error("Error initializing PDF generation:", error)
      reject(error)
    }
  })
}

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
