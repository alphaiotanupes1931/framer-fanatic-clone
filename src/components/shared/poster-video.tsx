import { useState } from "react";
import { Play } from "lucide-react";
import { Img, SmartVideo } from "@/components/shared/smart-img";

/**
 * YouTube-style video: shows the thumbnail with a centered Play button,
 * then swaps to the player and starts playing in place when tapped.
 */
export function PosterVideo({
  src,
  poster,
  className = "",
  videoClassName = "",
}: {
  src: string;
  poster?: string | null;
  className?: string;
  videoClassName?: string;
}) {
  const [playing, setPlaying] = useState(false);
  if (playing || !poster) {
    return (
      <SmartVideo
        src={src}
        controls
        playsInline
        autoPlay={playing}
        preload="metadata"
        className={videoClassName}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying(true); }}
      aria-label="Play video"
      className={`relative block w-full overflow-hidden bg-black ${className}`}
    >
      <Img src={poster} alt="" className="block max-h-[640px] w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white">
          <Play className="ml-1 h-8 w-8 fill-current" />
        </span>
      </span>
    </button>
  );
}
