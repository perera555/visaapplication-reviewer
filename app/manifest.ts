import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VisaReview – Visa document review",
    short_name: "VisaReview",
    description: "Review visa documents, success rate, refusal analysis and letters for every country.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#03140c",
    theme_color: "#039855",
    orientation: "any",
    categories: ["productivity", "travel", "utilities"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
