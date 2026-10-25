import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { EntryOverlay } from "@/components/app/entry";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Footprint AI — The source of truth for hardware engineering" },
      { name: "description", content: "Superfolders connect local documents, Drive, Jira, Slack and your PLM into one source of truth, so hardware teams catch conflicts early, build faster and scale without the roadblocks." },
      { property: "og:title", content: "Footprint AI — The source of truth for hardware engineering" },
      { property: "og:description", content: "Superfolders connect local documents, Drive, Jira, Slack and your PLM into one source of truth, so hardware teams catch conflicts early, build faster and scale without the roadblocks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon-64.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Keep this root providers-only: canvas preview routes (/__mockup,
// /__component) render inside it, so any chrome leaks into every frame.
function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <EntryOverlay />
      </AuthProvider>
    </QueryClientProvider>
  );
}
