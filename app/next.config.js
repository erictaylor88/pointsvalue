/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings about external packages in API routes
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig
