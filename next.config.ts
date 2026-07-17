import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许较大的媒体上传（CMS）
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
