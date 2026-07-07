import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qvsqnascoorehrifvimh.supabase.co', // Mude para o seu domínio do Supabase
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
module.exports = nextConfig

export default nextConfig;
