import QRCode from "qrcode"

export interface QRCodeOptions {
  size?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  errorCorrectionLevel?: "L" | "M" | "Q" | "H"
}

export const generateQRCode = async (text: string, options: QRCodeOptions = {}): Promise<string> => {
  const defaultOptions = {
    width: options.size || 300,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || "#000000",
      light: options.color?.light || "#FFFFFF",
    },
    errorCorrectionLevel: options.errorCorrectionLevel || ("H" as const),
    type: "image/png" as const,
    quality: 1,
    rendererOpts: {
      quality: 1,
    },
  }

  try {
    const qrCodeDataURL = await QRCode.toDataURL(text, defaultOptions)
    return qrCodeDataURL
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

export const generateHighResQRCode = async (text: string, size = 600): Promise<string> => {
  return generateQRCode(text, {
    size,
    margin: 4,
    errorCorrectionLevel: "H",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  })
}

export const getVerificationURL = (verificationId: string): string => {
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  return `${baseURL}/verify/${verificationId}`
}
