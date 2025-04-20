/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      ignoreDuringBuilds: true, // 💥 THIS SKIPS ESLINT ERRORS IN VERCEL
    },
  };
  
  module.exports = nextConfig;
  