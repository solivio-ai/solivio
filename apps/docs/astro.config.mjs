import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightOpenAPI, { openAPISidebarGroups } from "starlight-openapi";

function sectionSidebarPlugin() {
  return {
    name: "solivio-section-sidebars",
    hooks: {
      "config:setup"({ addRouteMiddleware }) {
        addRouteMiddleware({
          entrypoint: "./src/starlightRouteData.ts",
          order: "post"
        });
      }
    }
  };
}

export default defineConfig({
  site: "https://solivio.ai",
  integrations: [
    starlight({
      title: "Solivio",
      description: "Docs for the open-source AI system that transforms how B2B companies create offers.",
      logo: {
        src: "./src/assets/solivio-logo.png",
        alt: "Solivio",
        replacesTitle: true
      },
      favicon: "/favicon.png",
      customCss: ["./src/styles/solivio.css"],
      head: [
        { tag: "link", attrs: { rel: "apple-touch-icon", href: "/favicon.png" } },
        { tag: "meta", attrs: { name: "theme-color", content: "#facc15" } }
      ],
      components: {
        Header: "./src/components/Header.astro"
      },
      plugins: [
        starlightOpenAPI([
          {
            base: "api",
            schema: "./public/openapi/solivio.json",
            sidebar: {
              label: "API Reference",
              operations: {
                badges: true,
                labels: "summary",
                sort: "document"
              },
              tags: {
                sort: "document"
              }
            }
          }
        ]),
        sectionSidebarPlugin()
      ],
      sidebar: [
        {
          label: "Guides",
          items: [
            { label: "Overview", link: "/guides/" },
            { label: "Getting started", link: "/guides/getting-started/" },
            { label: "Brand", link: "/guides/brand/" },
            { label: "API contract", link: "/guides/api-contract/" },
            { label: "Deployment", link: "/guides/deployment/" },
            { label: "Publishing", link: "/guides/publishing/" }
          ]
        },
        ...openAPISidebarGroups
      ]
    })
  ]
});
