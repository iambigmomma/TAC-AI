/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's.gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.auth0.com',
        port: '',
        pathname: '/avatars/**',
      },
      {
        protocol: 'https',
        hostname: 'tac-ai-translation.fra1.cdn.digitaloceanspaces.com', // Add this back
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: { 
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  async headers() {
    // Return an empty array if no custom headers are needed currently
    return []; 
  }
}

export default nextConfig 