import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SehatLens – Medical Report Analyzer",
    short_name: "SehatLens",
    description: "Organise, chart and understand your family's medical reports.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f8f7",
    theme_color: "#0f766e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
