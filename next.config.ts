import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },

  // 👇 ADD THIS SECTION
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;