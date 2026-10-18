import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = resolve(import.meta.dirname, '..');

function projectFiles() {
  return {
    name: 'modo-project-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/calendar-connectors.js') {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.end(readFileSync(resolve(root, 'calendar-connectors.js')));
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'calendar-connectors.js',
        source: readFileSync(resolve(root, 'calendar-connectors.js'))
      });
    }
  };
}

export default defineConfig({
  root: import.meta.dirname,
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [react(), projectFiles()],
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: false,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:8080');
          });
        }
      }
    }
  }
});
