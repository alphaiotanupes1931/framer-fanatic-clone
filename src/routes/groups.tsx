import { createFileRoute } from "@tanstack/react-router";
import { GroupsPage } from "@/components/groups-page";
export const Route = createFileRoute("/groups")({
  component: GroupsPage,
  head: () => ({
    meta: [
      { title: "Groups / Communities - Planet Baltimore" },
      { name: "description", content: "Find your people and build something together in Baltimore." },
    ],
  }),
});
