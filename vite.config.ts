import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Desactivamos la minificación para que el build termine rapidísimo
      // y no alcance el límite de 10 minutos de Coolify en servidores pequeños.
      minify: false,
      sourcemap: false
    },
    server: {
      proxy: {
        '/api': {
          // El servidor Express corre en el puerto 3000 (server/index.js,
          // .env.example, Docker). Antes apuntaba a 3001 y rompía el login en
          // el flujo `npm run dev` (todas las llamadas /api fallaban).
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    }
  };
});
