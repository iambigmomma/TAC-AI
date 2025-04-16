/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        hostname: 's2.googleusercontent.com',
      },
      {
        hostname: 'tac-ai-translation.fra1.cdn.digitaloceanspaces.com',
      },
    ],
  },
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
