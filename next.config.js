/** @type {import('next').NextConfig} */
const nextConfig = {
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
