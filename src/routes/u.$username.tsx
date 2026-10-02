import { createFileRoute, redirect } from "@tanstack/react-router";

// Profiles live at /:username now. Keep the old /u/:username links working.
export const Route = createFileRoute("/u/$username")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/$username",
      params: { username: params.username },
      search: location.search,
      replace: true,
    });
  },
});
