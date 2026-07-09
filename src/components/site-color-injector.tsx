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
  const textOnBlue = siteText(content, "colors.textOnBlue").trim();
  const textOnBlueDeep = siteText(content, "colors.textOnBlueDeep").trim();
  const textOnPaper = siteText(content, "colors.textOnPaper").trim();
  const rules: string[] = [
    `:root{--blue:${blue};--blue-deep:${blueDeep};--ink:${ink};--paper:${paper};}`,
  ];
  // Section text-color overrides. Use high-specificity selectors so utility
  // classes like text-paper / text-ink still get overridden when set.
  if (textOnBlue) {
    rules.push(`.bg-blue, .bg-blue *{color:${textOnBlue} !important;}`);
  }
  if (textOnBlueDeep) {
    rules.push(`.bg-blue-deep, .bg-blue-deep *{color:${textOnBlueDeep} !important;}`);
  }
  if (textOnPaper) {
    rules.push(`.bg-paper, .bg-paper *{color:${textOnPaper} !important;}`);
  }
  const css = rules.join("");
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}