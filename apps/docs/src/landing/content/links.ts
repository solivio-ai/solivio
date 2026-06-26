import type { LandingLocale } from "./types";

export const siteOrigin = "https://solivio.ai";
export const githubUrl = "https://github.com/solivio-ai/solivio";
export const deraveUrl = "https://derave.dev";
export const deraveReferralUrl = (locale: LandingLocale, placement: string) => {
  const url = new URL(locale === "en" ? "/en/" : "/", deraveUrl);

  url.searchParams.set("utm_source", "solivio.ai");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "solivio_landing");
  url.searchParams.set("utm_content", `${locale}_${placement}`);

  return url.toString();
};
