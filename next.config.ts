import type { NextConfig } from "next";

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
      "script-src 'self' 'unsafe-inline' https://*.daily.co", // SEC-011: Added Daily.co scripts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openai.azure.com https://*.daily.co wss://*.daily.co https://*.wss.daily.co", // Added Daily.co WebSockets
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

export default nextConfig;
