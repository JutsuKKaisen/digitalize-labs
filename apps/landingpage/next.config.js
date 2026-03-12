/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig = {
    transpilePackages: ['@dl/ui', '@dl/database'],
    output: 'standalone',
    reactStrictMode: true,
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
};

module.exports = withNextIntl(nextConfig);
