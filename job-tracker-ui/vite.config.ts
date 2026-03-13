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

  // If you are using a Dev Container, you may need to set the server.host option to 127.0.0.1
  // https://vite.dev/guide/troubleshooting#dev-containers-vs-code-port-forwarding
  server: {
    host: '127.0.0.1',
    hmr: {
      clientPort: 5173
    }
  }

})
