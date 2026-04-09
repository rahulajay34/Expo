/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['framer-motion', 'react-markdown', 'rehype-highlight', 'highlight.js', 'mermaid'],
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
