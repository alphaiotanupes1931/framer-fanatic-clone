import { useSiteContent, siteText } from "@/hooks/use-site-content";

/**
 * Applies admin-editable landing-page color tokens by overriding CSS
 * custom properties on :root. Mount once per public page that uses
 * the --blue / --blue-deep / --ink / --paper token family.
 */
export function SiteColorInjector() {
  const { content } = useSiteContent();
  const blue = siteText(content, "colors.blue");
  const blueDeep = siteText(content, "colors.blueDeep");
  const ink = siteText(content, "colors.ink");
  const paper = siteText(content, "colors.paper");
  const css = `:root{--blue:${blue};--blue-deep:${blueDeep};--ink:${ink};--paper:${paper};}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}