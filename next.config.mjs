import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  // Fix: @react-three/fiber 8.x reads ReactCurrentOwner from
  // React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, which was
  // removed in React 19.  Next 15 aliases react to its compiled React 19 on
  // the client, which breaks R3F.  We override only the CLIENT bundle to use
  // the project's React 18.3.1.  The server keeps Next's own React 19
  // (required for react.cache() and other server APIs).
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: resolve(__dirname, "node_modules/react"),
        "react-dom": resolve(__dirname, "node_modules/react-dom"),
      };
    }
    return config;
  },
};

export default nextConfig;
