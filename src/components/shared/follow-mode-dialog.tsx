import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type FollowMode = { allowDms: boolean };

let opener: ((resolve: (m: FollowMode | null) => void) => void) | null = null;

/** Asks how the person wants to follow. Resolves null if they cancel. */
export function chooseFollowMode(): Promise<FollowMode | null> {
  return new Promise((resolve) => {
    if (!opener) { resolve({ allowDms: true }); return; }
    opener(resolve);
  });
}

const OPTIONS = [
  { value: true, title: "Posts & Messages", desc: "See their posts and receive their DMs." },
  { value: false, title: "Posts Only", desc: "See their posts in your following feed without receiving DMs." },
];

/** Mounted once at the root so every Follow button shares it. */
export function FollowModeHost() {
  const [resolver, setResolver] = useState<((m: FollowMode | null) => void) | null>(null);
  const [choice, setChoice] = useState(true);

  useEffect(() => {
    opener = (resolve) => { setChoice(true); setResolver(() => resolve); };
    return () => { opener = null; };
  }, []);

  const finish = (m: FollowMode | null) => { resolver?.(m); setResolver(null); };

  return (
    <Dialog open={!!resolver} onOpenChange={(o) => { if (!o) finish(null); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>How would you like to follow?</DialogTitle>
        </DialogHeader>
        <div role="radiogroup" className="space-y-2">
          {OPTIONS.map((o) => {
            const active = choice === o.value;
            return (
              <button
                key={o.title}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setChoice(o.value)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${active ? "border-primary" : "border-border"}`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-primary" : "border-muted-foreground"}`}>
                  {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{o.title}</span>
                  <span className="block text-xs text-muted-foreground">{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => finish(null)}>Cancel</Button>
          <Button onClick={() => finish({ allowDms: choice })}>Follow</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
