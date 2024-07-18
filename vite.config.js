import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const config = {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use './src/assets/styles' as *;`,
        },
      },
    },
    plugins: [
        vue(),
        Components({
          // allow auto load markdown components under `./src/components/`
          extensions: ["vue", "md"],
          // allow auto import and register components used in markdown
          include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
          resolvers: [
            ElementPlusResolver({
              importStyle: "sass",
            }),
          ],
          dts: "src/components.d.ts",
        }),
        VitePWA({
          registerType: 'autoUpdate',
          devOptions: {
            enabled: false,
          },
          manifest: {
            name: 'Mapintegratedvuer',
            short_name: 'mapintegratedvuer',
            description: 'Map Integrated Vuer',
            theme_color: '#ffffff',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        }),

      // https://github.com/antfu/unocss
      // see unocss.config.ts for config
    ],
    // for cypress component test
    // to prevent reloading after optimized dependencies changed
    optimizeDeps: {
      exclude: ["vue-router"],
    },
  };

  if (command === "serve") {
    config.server = {
      port: 8081,
    };
    config.define = {
      "process.env.HTTP_PROXY": 8081,
      global: "globalThis",
      // If you want to exposes all env variables, which is not recommended
      // 'process.env': env
    };
  }
  return config;
});
