import { redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { getOrgSeo } from "@/lib/org-access.functions";
import { orgPrefix } from "@/lib/org-paths";

/** Loader for typed page URLs: sends a page opened under the wrong letter to the right one. */
export async function loadOrgSeo(slug: string, prefix: string) {
  let seo: Awaited<ReturnType<typeof getOrgSeo>>;
  try {
    seo = await getOrgSeo({ data: { slug } });
  } catch {
    return { indexable: false as const };
  }
  if (seo.indexable && orgPrefix(seo.type) !== prefix) {
    throw redirect({ href: `/${orgPrefix(seo.type)}/${slug}`, replace: true });
  }
  return seo;
}

export function orgHead(prefix: string, slug: string, loaderData: Awaited<ReturnType<typeof loadOrgSeo>> | undefined) {
  if (!loaderData?.indexable) {
    return {
      meta: [
        { title: "Private page - Planet Baltimore" },
        { name: "robots", content: "noindex, nofollow, noarchive" },
        { name: "googlebot", content: "noindex, nofollow" },
      ],
    };
  }
  const url = `https://planetbaltimore.com/${prefix}/${slug}`;
  const description = loaderData.description || `${loaderData.name} on Planet Baltimore.`;
  return {
    meta: [
      { title: `${loaderData.name} - Planet Baltimore` },
      { name: "description", content: description },
      { property: "og:title", content: loaderData.name },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function OrgError() {
  return (
    <AppLayout title="" hero={false}>
      <div className="py-20 text-center text-muted-foreground">This page could not be loaded.</div>
    </AppLayout>
  );
}

export function OrgNotFound() {
  return (
    <AppLayout title="" hero={false}>
      <div className="py-20 text-center text-muted-foreground">Page not found.</div>
    </AppLayout>
  );
}
