import { defineConfig } from "vite";

export default defineConfig({
  root: "src/frontend/peer-invitations-ui",
  build: {
    emptyOutDir: true,
    outDir: "../../../static/peer-invitations",
  },
});
