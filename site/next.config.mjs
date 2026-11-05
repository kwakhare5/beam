/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
