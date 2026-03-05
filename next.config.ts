import type { NextConfig } from "next";

const nextConfig = (phase: string): NextConfig => ({
  env: {
    NEXT_IS_BUILD: phase === 'phase-production-build' ? 'true' : 'false',
  },
  output: 'standalone',
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'plus.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.pexels.com', pathname: '/**' },
      { protocol: 'https', hostname: 'photos.google.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'medusa-public-images.s3.eu-west-1.amazonaws.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000', pathname: '/**' }
    ],
    dangerouslyAllowSVG: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },
  async rewrites() {
    return []
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Link',
            value: '<https://res.cloudinary.com>; rel=dns-prefetch, <https://www.googletagmanager.com>; rel=dns-prefetch',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://checkout.razorpay.com https://va.vercel-scripts.com https://cdn.jsdelivr.net;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              img-src 'self' blob: data: https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://stats.g.doubleclick.net https://res.cloudinary.com https://images.unsplash.com https://plus.unsplash.com https://images.pexels.com https://photos.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com http://localhost:9000 http://127.0.0.1:9000;
              font-src 'self' data: https://fonts.gstatic.com;
              connect-src 'self' ${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"} http://localhost:9000 http://127.0.0.1:9000 https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://stats.g.doubleclick.net https://checkout.razorpay.com https://vitals.vercel-insights.com;
              frame-src 'self' https://checkout.razorpay.com;
              media-src 'self' https://res.cloudinary.com;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              upgrade-insecure-requests;
            `.replace(/\s{2,}/g, ' ').trim()
          }
        ],
      },
    ];
  },
});

export default nextConfig;
