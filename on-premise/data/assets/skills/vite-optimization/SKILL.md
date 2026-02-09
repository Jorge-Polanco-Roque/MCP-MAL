# Vite Build Optimization

## Overview
Optimize Vite builds for production. Covers code splitting, lazy loading, chunk analysis, and development experience tuning.

## Code Splitting with Lazy Routes
```tsx
const SprintBoard = lazy(() => import('./pages/SprintBoard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

<Route path="/sprint" element={
  <Suspense fallback={<PageSkeleton />}>
    <SprintBoard />
  </Suspense>
} />
```

## Manual Chunks
```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

## Chunk Analysis
```bash
npx vite-bundle-visualizer
```

## Proxy Configuration (Dev)
```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
    '/ws': { target: 'ws://localhost:8000', ws: true },
  },
},
```

## Environment Variables
```ts
// Only VITE_ prefixed vars are exposed to client
const apiUrl = import.meta.env.VITE_API_URL;
```

## Best Practices
- Enable `build.sourcemap: true` for debugging production issues
- Use `optimizeDeps.include` for large deps that slow HMR
- Set `build.target: 'es2020'` for modern browsers
- Analyze bundle size after each dependency addition
