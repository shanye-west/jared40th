import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Enables PWA in local dev (npm run dev)
      },
      manifest: {
        name: 'Rowdy Cup',
        short_name: 'RowdyCup',
        description: 'Live scoring for the Rowdy Cup tournament',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Hides browser UI
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable', // Required for "Adaptive Icons" on Android
          },
        ],
      },
    }),
  ],
});