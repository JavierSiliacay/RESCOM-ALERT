import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/download", "/enlist/", "/rescom-ai", "/ai"],
        disallow: ["/dashboard/", "/api/", "/sign-in", "/sign-in/"],
      },
    ],
    sitemap: "https://www.rescom-alert.site/sitemap.xml",
  };
}
