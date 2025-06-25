import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hcptwjqnbcecbpqxnpyl.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHR3anFuYmNlY2JwcXhucHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3ODMxMzUsImV4cCI6MjA2NjM1OTEzNX0.u8tff3MfWEoFywt1An6Ev4AwDI2r13W7TV6BiW42GaQ"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client
export const createServerClient = () => {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
  return createClient(supabaseUrl, serviceRoleKey)
}
