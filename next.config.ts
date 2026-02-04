import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// SEC-011: Security headers for HIPAA compliance
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // SEC-011: Removed unsafe-eval, kept unsafe-inline for Tailwind
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co", // SEC-011: Added Daily.co scripts + unsafe-eval required by Daily.co SDK
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openai.azure.com https://*.daily.co wss://*.daily.co https://*.wss.daily.co https://*.sentry.io https://*.ingest.sentry.io", // Added Sentry
      "frame-src 'self' https://*.daily.co", // SEC-011: Allow Daily.co frames for telehealth
      "media-src 'self' blob: https://*.daily.co", // Allow video/audio streams
      "worker-src 'self' blob:", // Allow web workers for Daily.co
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

// Telehealth-specific headers with camera/mic permissions
const telehealthHeaders = [
  ...securityHeaders.filter(h => h.key !== 'Permissions-Policy'),
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()',
  },
];

// Default headers with all permissions disabled
const defaultHeaders = [
  ...securityHeaders,
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  // OPTIMIZATION: Image optimization settings
  images: {
    // Use modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Optimize images at these sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Minimize layout shift
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // OPTIMIZATION: Enable compression
  compress: true,

  // OPTIMIZATION: Minimize bundle size
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header

  // OPTIMIZATION: Enable experimental features for better performance
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
  },

  // Apply security headers to all routes
  async headers() {
    return [
      // SEC-011: Allow camera/mic on telehealth routes
      {
        source: '/telehealth/:path*',
        headers: telehealthHeaders,
      },
      // Allow microphone on notes pages for AI Scribe
      {
        source: '/notes/:path*',
        headers: telehealthHeaders,
      },
      // All other routes EXCEPT /notes and /telehealth - strict permissions
      // Using regex to exclude specific paths
      {
        source: '/((?!notes|telehealth).*)',
        headers: defaultHeaders,
      },
      // Also apply to root path
      {
        source: '/',
        headers: defaultHeaders,
      },
    ];
  },
};

// Wrap with Sentry configuration
export default withSentryConfig(nextConfig, {
  // Sentry organization and project (set in environment variables)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Source maps configuration
  sourcemaps: {
    // Don't delete source maps after upload (needed for debugging)
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically annotate React components for better debugging
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
