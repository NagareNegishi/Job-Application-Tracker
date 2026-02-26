import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// for tailwindcss
import tailwindcss from '@tailwindcss/vite'
// for shadcn/ui
import path from 'path'

// https://vite.dev/config/
export default defineConfig({

  plugins: [
    react(),
    tailwindcss(),
  ],

  // for shadcn/ui
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

})
