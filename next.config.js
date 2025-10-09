/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  // Optimize build performance
  swcMinify: true,
  // Reduce memory usage during build
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

module.exports = nextConfig;
