/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": [
      ".git/**/*",
      ".crittable/**/*",
      ".gamehall/**/*",
      "artifacts/**/*",
      "coverage/**/*",
      "docs/**/*",
      "electron/**/*",
      "release*/**/*",
      "scripts/**/*",
      "src/**/*",
      "tests/**/*",
      "*.md",
      "*.log",
      "eslint.config.mjs",
      "vitest.config.ts",
      "tsconfig*.json",
    ],
  },
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "object-src 'none'",
              "frame-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
