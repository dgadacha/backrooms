import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Backrooms — config Vite.
// On garde Three.js pinné en 0.154.0 (r155+ casse les intensités lumières).
// Les modules importent encore `three/addons/...` (convention de l'ancienne
// importmap) → alias vers le vrai chemin npm `three/examples/jsm/...`.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^three\/addons\//,
        replacement: fileURLToPath(new URL('./node_modules/three/examples/jsm/', import.meta.url)),
      },
    ],
  },
  // public/ est servi à la racine (/textures/…, /models/…, /audio/…)
  publicDir: 'public',
  // pas de SPA : un asset manquant renvoie un vrai 404 (pas le fallback index.html)
  // → les loaders GLB/textures reçoivent une erreur propre et basculent en fallback.
  appType: 'mpa',
  server: { port: 5173, host: true },
  // évite que Vite pré-bundle three en double instance
  optimizeDeps: { include: ['three'] },
});
