/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // il lint del monorepo gira con `pnpm lint` (flat config alla root):
  // non duplichiamo la config eslint bundlata di Next nel build.
  eslint: { ignoreDuringBuilds: true },
  // i package del monorepo esportano sorgenti TS: Next li transpila
  transpilePackages: ["@eventi/core", "@eventi/config", "@eventi/sources"],
  // playwright non deve essere bundlato (usato solo lato server dallo scraper,
  // via import dinamico). Lo lasciamo come require runtime di Node.
  serverExternalPackages: ["playwright", "playwright-core", "chromium-bidi"],
};

export default nextConfig;
