// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://miqueleg.github.io",
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: "github-dark-dimmed", wrap: false },
  },
  // keep the old al-folio URLs working
  redirects: {
    "/projects": "/research",
    "/repositories": "/methods",
    "/tools": "/methods",
    "/projects/protonation-optimizer": "/blog/2025/Protonation-Optimizer",
    "/projects/qmmesp": "/blog/2025/QMMESP",
    "/projects/aiqm2-orca-sella": "/blog/2025/AIQM2-ORCA-Sella",
  },
});
