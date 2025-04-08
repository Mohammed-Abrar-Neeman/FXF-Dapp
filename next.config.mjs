import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Let Next.js handle CSS Modules natively
  images: {
    domains: ['images.unsplash.com'],
  },
};

export default withBundleAnalyzer(nextConfig); 