/** @type {import('next').NextConfig} */

// Shared secrets may live in a .env one level above the app (the project root). Variables that
// are already set, e.g. from .env.local, are never overwritten.
for (const file of ['../.env']) {
  try {
    if (typeof process.loadEnvFile === 'function') process.loadEnvFile(file);
  } catch {
    // no such file
  }
}

const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
