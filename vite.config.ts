import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'demo/index.html')
    }
  },
  server: {
    port: 3000,
    open: '/demo/index.html',
    fs: {
      // Permitir servir arquivos da pasta lib
      allow: ['.']
    },
    // Configurar headers para arquivos .js e .mem
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  },
  // Usar pasta public que será servida na raiz
  publicDir: 'public',
  assetsInclude: ['**/*.js', '**/*.mem'],
  // Configurar tipos MIME corretos
  optimizeDeps: {
    exclude: ['OggVorbisEncoder.min.js', 'Mp3LameEncoder.min.js']
  }
});
