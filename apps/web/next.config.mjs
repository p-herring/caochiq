/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@coaching/shared"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {},
};

export default nextConfig;
