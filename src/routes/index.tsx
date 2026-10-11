import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Footprint" },
      { name: "description", content: "Footprint — knowledge workspace" },
      { property: "og:title", content: "Footprint" },
      { property: "og:description", content: "Footprint — knowledge workspace" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <div className="min-h-screen bg-background" />;
}
