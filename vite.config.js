import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // For local dev with `vercel dev`, the API runs on the same origin at /api.
    // If you run the API separately, proxy /api here.
  },
});
