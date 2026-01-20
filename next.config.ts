import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages with native bindings that should not be bundled by Turbopack
  serverExternalPackages: ["@mastra/*", "ssh2", "cpu-features", "oracledb"],
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
