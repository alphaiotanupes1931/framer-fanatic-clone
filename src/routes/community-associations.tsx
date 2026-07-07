import { createFileRoute } from "@tanstack/react-router";
import { CommunityAssociationsPage } from "@/components/community-associations-page";
export const Route = createFileRoute("/community-associations")({
  component: CommunityAssociationsPage,
  head: () => ({
    meta: [
      { title: "Community Associations - Planet Baltimore" },
      { name: "description", content: "Official community governance hubs for Baltimore neighborhoods." },
    ],
  }),
});
