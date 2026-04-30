import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

const guidePathPrefix = "/guides";
const devPathPrefix = "/dev";
const apiPathPrefix = "/api";

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const pathname = context.url.pathname;

  if (pathname.startsWith(guidePathPrefix)) {
    route.sidebar = route.sidebar.filter(
      (entry) => entry.type === "group" && entry.label === "Guides",
    );
  }

  if (pathname.startsWith(devPathPrefix)) {
    route.sidebar = route.sidebar.filter(
      (entry) => entry.type === "group" && entry.label === "Development",
    );
  }

  if (pathname.startsWith(apiPathPrefix)) {
    route.sidebar = route.sidebar.filter(
      (entry) => entry.type === "group" && entry.label === "API Reference",
    );
  }
});
