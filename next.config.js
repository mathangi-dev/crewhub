/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from failing on OneDrive reparse points during recursiveDelete on Windows
  cleanDistDir: false,
};

module.exports = nextConfig;

