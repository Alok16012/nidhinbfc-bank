import type { MetadataRoute } from "next";

// Lets phones install the site as an app ("Add to Home screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grihsevak Nidhi",
    short_name: "Grihsevak",
    description: "Members, deposits, loans and collections for Grihsevak Nidhi Limited",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef1fb",
    theme_color: "#eef1fb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
