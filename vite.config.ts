import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const forGitHubPages = process.env.GITHUB_PAGES === "true";
  return {
    // GitHub Pages は /リポジトリ名/ 配下で公開する
    base: forGitHubPages ? "/gakkyu-dayori/" : "/",
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ["heic-to"],
    },
    define: {
      __GDAK_GOOGLE_CLIENT_ID__: JSON.stringify(env.VITE_GOOGLE_CLIENT_ID ?? ""),
    },
  };
});
