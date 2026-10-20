import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env.FRONTEND_URL': JSON.stringify(env.FRONTEND_URL),
      'process.env.BACKEND_URL': JSON.stringify(env.BACKEND_URL)
    },
    plugins: [react()],
    // Same as nginx in the Docker image: /api goes to snippet-service, without the prefix.
    server: {
      proxy: {
        '/api': {
          target: env.SNIPPET_SERVICE_URL ?? 'http://localhost:8080',
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
