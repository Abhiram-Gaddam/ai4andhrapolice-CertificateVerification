/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://ai4andhrapolice-certificate-verific.vercel.app',
  },
  images: {
    domains: ['ai4andhrapolice-certificate-verific.vercel.app'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
