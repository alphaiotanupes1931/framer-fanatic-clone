import { useEffect, useState } from "react";
import type { AnchorHTMLAttributes, AudioHTMLAttributes, ImgHTMLAttributes, VideoHTMLAttributes } from "react";
import { useSmartImageUrl } from "@/components/smart-image";
import { AvatarImage } from "@/components/ui/avatar";

/**
 * Drop-in replacement for <img> that resolves Planet Baltimore storage URLs
 * into short-lived signed URLs at render time. Non-storage URLs pass through.
 */
export function Img({ src, loading, decoding, className, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolved = useSmartImageUrl(typeof src === "string" ? src : undefined);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(false); }, [resolved]);
  if (!src) return null;
  return (
    <img
      {...rest}
      className={`${className ?? ""} transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"}`}
      loading={loading ?? "eager"}
      decoding={decoding ?? "async"}
      src={resolved ?? undefined}
      onLoad={(e) => { setReady(true); rest.onLoad?.(e); }}
      ref={(el) => { if (el?.complete && el.naturalWidth > 0) setReady(true); }}
    />
  );
}

type AvatarImageProps = React.ComponentProps<typeof AvatarImage>;

/** Avatar image that signs private storage URLs before rendering. */
export function SmartAvatarImage({ src, ...rest }: AvatarImageProps) {
  const resolved = useSmartImageUrl(typeof src === "string" ? src : undefined);
  if (!resolved) return null;
  return <AvatarImage {...rest} src={resolved} />;
}

/** <video> that re-signs private storage URLs before playback. */
export function SmartVideo({ src, ...rest }: VideoHTMLAttributes<HTMLVideoElement>) {
  const raw = typeof src === "string" ? src : undefined;
  const base = raw?.split("#")[0];
  const hash = raw && raw.includes("#") ? `#${raw.split("#").slice(1).join("#")}` : "";
  const resolved = useSmartImageUrl(base);
  if (!raw) return null;
  return <video {...rest} src={resolved ? `${resolved}${hash}` : undefined} />;
}

/** <audio> that re-signs private storage URLs before playback. */
export function SmartAudio({ src, children, ...rest }: AudioHTMLAttributes<HTMLAudioElement>) {
  const resolved = useSmartImageUrl(typeof src === "string" ? src : undefined);
  if (!src) return null;
  return (
    <audio {...rest} src={resolved ?? undefined}>
      {children}
    </audio>
  );
}

/** Link to a stored document that re-signs the URL before download. */
export function SmartFileLink({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const resolved = useSmartImageUrl(typeof href === "string" ? href : undefined);
  return (
    <a {...rest} href={resolved ?? undefined}>
      {children}
    </a>
  );
}
