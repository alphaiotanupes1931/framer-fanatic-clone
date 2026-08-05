import type { ImgHTMLAttributes } from "react";
import { useSmartImageUrl } from "@/components/smart-image";
import { AvatarImage } from "@/components/ui/avatar";

/**
 * Drop-in replacement for <img> that resolves Planet Baltimore storage URLs
 * into short-lived signed URLs at render time. Non-storage URLs pass through.
 */
export function Img({ src, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolved = useSmartImageUrl(typeof src === "string" ? src : undefined);
  if (!src) return null;
  return <img {...rest} src={resolved ?? undefined} />;
}

type AvatarImageProps = React.ComponentProps<typeof AvatarImage>;

/** Avatar image that signs private storage URLs before rendering. */
export function SmartAvatarImage({ src, ...rest }: AvatarImageProps) {
  const resolved = useSmartImageUrl(typeof src === "string" ? src : undefined);
  if (!resolved) return null;
  return <AvatarImage {...rest} src={resolved} />;
}
