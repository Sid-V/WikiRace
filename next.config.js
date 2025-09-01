/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import("next").NextConfig} */
const config = {
  // Performance optimizations
  experimental: {
    // optimizeCss: true, // Disabled due to critters dependency issue
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-alert-dialog', 
      '@radix-ui/react-avatar', 
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot'
    ],
  },
  
  // Server external packages (moved from experimental)
  serverExternalPackages: ['@prisma/client'],
  
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
        port: '',
        pathname: '/**',
      },
    ],
    // Note: formats property removed due to TypeScript compatibility issues
    // Next.js will use optimal formats automatically
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Webpack optimizations for bundle splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split large vendor libraries into separate chunks
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          'radix-ui': {
            name: 'radix-ui',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            chunks: 'all',
            priority: 10,
          },
          'auth-prisma': {
            name: 'auth-prisma', 
            test: /[\\/]node_modules[\\/](@prisma|next-auth)[\\/]/,
            chunks: 'all',
            priority: 9,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            chunks: 'all',
            priority: 8,
          }
        }
      };
    }
    return config;
  },
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(config);
