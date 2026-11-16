import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages는 https://<user>.github.io/<repo>/ 하위 경로에서 서빙되므로 상대 경로로 빌드
  base: './',
  build: {
    chunkSizeWarningLimit: 800,
  },
});
