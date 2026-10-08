import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/download", "/enlist/"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: "https://www.rescom-alert.site/sitemap.xml",
  };
}
