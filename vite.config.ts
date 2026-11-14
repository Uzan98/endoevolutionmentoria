import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png", "icons/favicon-32.png"],
      manifest: {
        id: "/",
        name: "Endo Evolution · Mentoria",
        short_name: "Endo Evolution",
        description: "Área de membros da mentoria Endo Evolution: video-aulas em módulos, fórum de dúvidas e encontros ao vivo.",
        lang: "pt-BR",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#073B38",
        theme_color: "#073B38",
        categories: ["education", "medical"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Módulos", url: "/modulos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Fórum de dúvidas", url: "/forum", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Encontros ao vivo", url: "/encontros", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
        screenshots: [
          { src: "/screenshots/inicio.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Início do aluno" },
          { src: "/screenshots/aula.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Aula com vídeo e anotações" },
          { src: "/screenshots/inicio-desktop.png", sizes: "1536x1024", type: "image/png", form_factor: "wide", label: "Início no computador" },
        ],
      },
      workbox: {
        // App inteiro disponível offline (o conteúdo da demo vive no navegador).
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff,woff2,pdf}"],
        globIgnores: ["screenshots/**"],
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // vídeos .mp4 externos: sempre da rede (não cabem no cache)
            urlPattern: ({ request }) => request.destination === "video",
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
