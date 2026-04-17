import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// SEC-011: Security headers for HIPAA compliance
const baseSecurityHeaders = [
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
];

// F-021: CSP WITHOUT unsafe-eval for non-telehealth routes
const defaultCSP = {
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openai.azure.com https://*.sentry.io https://*.ingest.sentry.io",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
};

// F-021: CSP WITH unsafe-eval only for telehealth routes (required by Daily.co SDK)
const telehealthCSP = {
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openai.azure.com https://*.daily.co wss://*.daily.co https://*.wss.daily.co https://*.sentry.io https://*.ingest.sentry.io",
    "frame-src 'self' https://*.daily.co",
    "media-src 'self' blob: https://*.daily.co",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
};

// Telehealth-specific headers with camera/mic permissions and Daily.co CSP
const telehealthHeaders = [
  ...baseSecurityHeaders,
  telehealthCSP,
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()',
  },
];

// Default headers with strict CSP and all permissions disabled
const defaultHeaders = [
  ...baseSecurityHeaders,
  defaultCSP,
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()',
  },
];

// AI Scribe headers — microphone needed for voice recording on note routes
const scribeHeaders = [
  ...baseSecurityHeaders,
  defaultCSP,
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()',
  },
];

// HIPAA/PHI: prevent any proxy, CDN, or browser caching of API responses.
// Applied as a non-terminating rule that stacks on top of the default /
// telehealth header blocks via Next.js header merging.
const apiCacheHeaders = [
  {
    key: 'Cache-Control',
    value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  },
  {
    key: 'Pragma',
    value: 'no-cache',
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

  // 308 redirect for invitation emails sent before the URL was updated to /accept-invitation
  async redirects() {
    return [
      {
        source: '/auth/accept-invite',
        destination: '/accept-invitation',
        permanent: true,
      },
    ];
  },

  // Proxy /api/ai/* to external scribe service when SCRIBE_SERVICE_URL is set
  async rewrites() {
    const scribeUrl = process.env.SCRIBE_SERVICE_URL;
    if (!scribeUrl) return [];
    return [
      {
        source: '/api/ai/:path*',
        destination: `${scribeUrl}/api/ai/:path*`,
      },
    ];
  },

  // Apply security headers to all routes
  async headers() {
    return [
      // SEC-011: Allow camera/mic on telehealth routes
      {
        source: '/telehealth/:path*',
        headers: telehealthHeaders,
      },
      {
        source: '/api/telehealth/:path*',
        headers: telehealthHeaders,
      },
      // AI Scribe — allow microphone on note creation routes
      {
        source: '/notes/:path*',
        headers: scribeHeaders,
      },
      // All other routes EXCEPT telehealth and notes - strict permissions
      // Using regex to exclude specific paths
      {
        source: '/((?!telehealth|api/telehealth|notes).*)',
        headers: defaultHeaders,
      },
      // Also apply to root path
      {
        source: '/',
        headers: defaultHeaders,
      },
      // HIPAA: no-store cache headers on every API route. This rule stacks
      // additively on top of the defaultHeaders / telehealthHeaders blocks
      // above — Next.js merges headers from all matching header() entries.
      {
        source: '/api/:path*',
        headers: apiCacheHeaders,
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
