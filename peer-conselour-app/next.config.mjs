/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",

  experimental: {
    // Tree-shaking per-ikon/per-modul: mencegah barrel import menyeret
    // seluruh isi paket ke dalam bundle.
    optimizePackageImports: ["lucide-react", "framer-motion", "@untitledui/icons"],
  },

  // Pipeline optimasi gambar Next.js: AVIF/WebP otomatis + srcset responsif.
  images: {
    formats: ["image/avif", "image/webp"],
    // Selaras dengan breakpoint proyek (mobile 360-767, tablet 768-1023, desktop >=1024)
    deviceSizes: [360, 414, 640, 768, 828, 1024, 1200, 1440, 1920],
    imageSizes: [64, 96, 128, 176, 200, 256, 320, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 hari
  },

  async headers() {
    // Header keamanan dipisah dari header caching supaya aset statis
    // yang sudah content-hashed tidak ikut kena `no-store`.
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob: http://localhost:9000 http://127.0.0.1:9000; media-src 'self' blob:; connect-src 'self' http://localhost:8080 http://localhost:9000 http://127.0.0.1:9000 https://api-konseling.ub.ac.id wss://api-konseling.ub.ac.id ws://localhost:8080; frame-src 'self' https://www.youtube.com https://youtube.com https://docs.google.com https://drive.google.com; frame-ancestors 'self';",
      },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
    ];

    const immutable = {
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    };

    return [
      // Semua respons tetap membawa header keamanan.
      { source: "/:path*", headers: securityHeaders },

      // Aset build Next.js: nama file sudah mengandung hash isi -> aman di-cache selamanya.
      { source: "/_next/static/:path*", headers: [immutable] },
      { source: "/_next/image/:path*", headers: [immutable] },

      // Media di public/: nama file stabil, jadi pakai cache panjang + revalidasi latar.
      {
        source: "/:path*.(jpg|jpeg|png|webp|avif|gif|svg|ico|mp4|webm|woff|woff2|pdf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },

      // Endpoint API & rute terautentikasi tidak boleh di-cache.
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/(admin|tickets|my-counseling|login)/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/resources",
        destination: "/psikoedukasi",
        permanent: true,
      },
      {
        source: "/news",
        destination: "/berita",
        permanent: true,
      },
      {
        source: "/news/:slug",
        destination: "/berita/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
