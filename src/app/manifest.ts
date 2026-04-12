import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Practiq",
    short_name: "Practiq",
    description:
      "AI workspace for boutique professional services firms. Manage 50-200 client relationships with shared team memory.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
  };
}
