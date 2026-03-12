const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin(
  './i18n.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dl/ui', '@dl/database'],
  output: 'standalone',
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

module.exports = withNextIntl(nextConfig);
