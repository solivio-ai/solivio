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
  integrations: [
    starlight({
      title: "Solivio",
      description: "Open-source docs for the Solivio sales offer workflow.",
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
            { label: "API contract", link: "/guides/api-contract/" },
            { label: "Publishing", link: "/guides/publishing/" }
          ]
        },
        ...openAPISidebarGroups
      ]
    })
  ]
});
