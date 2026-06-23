/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
  },
  webpack: (config) => {
    // Optional/native deps that some packages (MetaMask SDK, pino) try to
    // resolve statically. They're not used in the browser bundle; mark as
    // false so webpack doesn't error on missing modules.
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

module.exports = nextConfig;
