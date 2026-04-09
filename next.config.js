/** @type {import('next').NextConfig} */
const nextConfig = {
  // S-032: Enable gzip/brotli compression for responses
  compress: true,
  experimental: {
    optimizePackageImports: ['framer-motion', 'react-markdown', 'rehype-highlight', 'highlight.js', 'mermaid'],
  },
  // S-032: Long-lived cache headers for immutable static assets
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      pdftk: false,
    };
    return config;
  },
};

module.exports = nextConfig;
