import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightOpenAPI, { openAPISidebarGroups } from "starlight-openapi";

export default defineConfig({
  integrations: [
    starlight({
      title: "Solivio",
      description: "Open-source docs for the Solivio sales offer workflow.",
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
        ])
      ],
      sidebar: [
        {
          label: "Guides",
          items: [
            { label: "Overview", link: "/" },
            { label: "Getting started", link: "/getting-started/" },
            { label: "API contract", link: "/api-contract/" },
            { label: "Publishing", link: "/publishing/" }
          ]
        },
        ...openAPISidebarGroups
      ]
    })
  ]
});
