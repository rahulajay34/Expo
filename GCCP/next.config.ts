import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REMOVED: output: "export" - We now use server-side features (API routes, auth)
  // For deployment, use Vercel, Railway, or similar platforms that support Next.js server features

  // Uncomment basePath only if deploying to a subpath
  // basePath: "/GCCP_Repo", 

  images: {
    unoptimized: true, // Can be removed if using Vercel's image optimization
  },
};

export default nextConfig;