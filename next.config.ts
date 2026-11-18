import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": ["./drizzle/0000_workspace_baseline.sql"],
  },
};

export default nextConfig;
