export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],
  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/supabase", "@vite-pwa/nuxt"],
  supabase: {
    redirect: false,
  },
  pwa: {
    manifest: {
      name: "Control de Figuritas 2026",
      short_name: "Figuritas 2026",
      description: "Control de figuritas para el Álbum del Mundial FIFA 2026",
      theme_color: "#10b981",
      background_color: "#020617",
      display: "standalone",
      orientation: "portrait",
      icons: [
        {
          src: "icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
    },
  },
});
