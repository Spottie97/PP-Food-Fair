import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Optional: Set a specific port for dev server
    open: true, // Optional: Automatically open browser
    proxy: {
      // Optional: Configure proxy for API requests if needed during dev
      // Example: Forward requests from /api to backend server
      // '/api/v1': {
      //   target: 'http://localhost:5000', // Your backend server URL
      //   changeOrigin: true,
      //   // rewrite: (path) => path.replace(/^\/api\/v1/, '') // If backend doesn't use /api/v1 prefix
      // }
    },
  },
});
