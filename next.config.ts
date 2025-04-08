import type { NextConfig } from 'next'

const config: NextConfig = {
  env: {
    NEXT_PUBLIC_SALE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_SALE_CONTRACT_ADDRESS,
    NEXT_PUBLIC_RPC_URL: 'https://bsc-testnet.publicnode.com', // More reliable RPC endpoint
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
}

export default config
