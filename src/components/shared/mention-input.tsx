import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/shared/smart-img";

type Person = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

type Base = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  style?: React.CSSProperties;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
};

/**
 * Text field with @mention autocomplete. Typing "@" plus two or more
 * characters searches people and inserts "@username" on pick.
 */
export function MentionField({
  multiline = false,
  rows = 3,
  value,
  onChange,
  className = "",
  placeholder,
  maxLength,
  style,
  onKeyDown,
}: Base & { multiline?: boolean; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (query === null || query.length < 1) { setPeople([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_all_users", { q: query, lim: 6 });
      if (!cancelled) { setPeople((data ?? []) as Person[]); setActive(0); }
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const detect = (el: HTMLTextAreaElement | HTMLInputElement) => {
    const caret = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, caret);
    const m = /(^|\s)@([a-zA-Z0-9_.-]{0,30})$/.exec(before);
    setQuery(m ? m[2] : null);
  };

  const pick = (p: Person) => {
    const el = ref.current;
    if (!el || !p.username) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = /(^|\s)@([a-zA-Z0-9_.-]{0,30})$/.exec(before);
    if (!m) return;
    const start = before.length - m[0].length + m[1].length;
    const next = `${value.slice(0, start)}@${p.username} ${value.slice(caret)}`;
    onChange(next);
    setQuery(null);
    setPeople([]);
    requestAnimationFrame(() => {
      const pos = start + p.username!.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (people.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % people.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + people.length) % people.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(people[active]); return; }
      if (e.key === "Escape") { setQuery(null); setPeople([]); return; }
    }
    onKeyDown?.(e);
  };

  const shared = {
    ref,
    value,
    placeholder,
    maxLength,
    style,
    className,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      onChange(e.target.value);
      detect(e.target);
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => detect(e.currentTarget),
    onBlur: () => setTimeout(() => { setQuery(null); setPeople([]); }, 150),
    onKeyDown: handleKeyDown,
  };

  return (
    <div className="relative w-full">
      {multiline
        ? <textarea {...(shared as React.ComponentProps<"textarea">)} rows={rows} />
        : <input {...(shared as React.ComponentProps<"input">)} />}
      {people.length > 0 && (
        <ul className="absolute bottom-full z-[200] mb-1 max-h-64 w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {people.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(p); }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${i === active ? "bg-accent" : "hover:bg-accent"}`}
              >
                <Avatar className="h-6 w-6">
                  {p.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                  <AvatarFallback className="text-[10px]">{(p.display_name || p.username || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium text-foreground">{p.display_name || p.username}</span>
                {p.username && <span className="truncate text-xs text-muted-foreground">@{p.username}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
