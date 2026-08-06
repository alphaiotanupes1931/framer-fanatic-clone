import { createFileRoute } from "@tanstack/react-router";
import { CommunityAssociationsPage } from "@/components/community-associations-page";
import { pageHead } from "@/lib/seo";
export const Route = createFileRoute("/community-associations")({
  component: CommunityAssociationsPage,
  head: () => pageHead({ path: "/community-associations", title: "Baltimore Community Associations | Planet Baltimore", description: "Official community governance hubs for Baltimore neighborhoods, with news, meetings and dues." }),
});
