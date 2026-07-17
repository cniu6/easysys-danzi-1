import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker / 云平台部署用独立产物（体积更小，只需 node server.js）
  output: "standalone",
  // 允许较大的媒体上传（CMS）
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
