import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/login", "/signup", "/admin"],
      },
    ],
    sitemap: "https://practiq.dev/sitemap.xml",
  };
}
