import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "mobile",
  envDir: "..",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
  build: {
    outDir: "../mobile-shell",
    emptyOutDir: true,
  },
});
