import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Only use base path for GitHub Pages default domain, not custom domains
  basePath: process.env.GITHUB_ACTIONS && !process.env.CUSTOM_DOMAIN ? '/PokerLeaderboard' : '',
  assetPrefix: process.env.GITHUB_ACTIONS && !process.env.CUSTOM_DOMAIN ? '/PokerLeaderboard' : '',
};

export default nextConfig;
