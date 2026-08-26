import type { NextConfig } from "next";

/**
 * Allow next/image to optimise media served from the WordPress host. Derived
 * from the env var so a production WP domain needs no code change.
 */
const wpUrl = new URL(process.env.NEXT_PUBLIC_WP_URL ?? "http://localhost:8080");

/**
 * Next 16 refuses to optimise images from hosts that resolve to a private IP,
 * as an SSRF guard. Local development serves WordPress from localhost, so the
 * guard has to be lifted there — but only there. On Vercel the WP host is a
 * public domain and the protection stays on.
 */
const isLocalWpHost = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(
  wpUrl.hostname,
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: wpUrl.protocol.replace(":", "") as "http" | "https",
        hostname: wpUrl.hostname,
        port: wpUrl.port || undefined,
        pathname: "/wp-content/**",
      },
    ],
    dangerouslyAllowLocalIP: isLocalWpHost,
  },
};

export default nextConfig;
