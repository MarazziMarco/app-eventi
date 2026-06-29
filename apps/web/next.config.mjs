/** @type {import('next').NextConfig} */
const isCapacitor = process.env.CAPACITOR_BUILD === "1";

const nextConfig = {
  reactStrictMode: true,
  // build per Capacitor: export statico in ./out (webDir dell'app)
  ...(isCapacitor ? { output: "export", images: { unoptimized: true } } : {}),
  // il lint del monorepo gira con `pnpm lint` (flat config alla root)
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@eventi/core", "@eventi/config", "@eventi/sources"],
  serverExternalPackages: ["playwright", "playwright-core", "chromium-bidi"],
};

export default nextConfig;
