import { useState } from "react";
import { usageLevel } from "@/lib/usage-metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

export function UsageBar({ used, limit, format, unitLabel, onSaveLimit }: {
  used: number; limit: number | null; format: (n: number) => string; unitLabel: string;
  onSaveLimit: (value: string) => Promise<void>;
}) {
  const lvl = usageLevel(used, limit);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const color = lvl.state === "over" ? "bg-red-600" : lvl.state === "warn" ? "bg-amber-500" : "bg-emerald-600";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-neutral-900">
          {format(used)} used{limit ? ` of ${format(limit)}` : ""}
        </div>
        {lvl.remaining !== null && <div className="text-sm text-neutral-600">{format(lvl.remaining)} left</div>}
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(lvl.percent ?? 0, 100)}%` }} />
      </div>
      {lvl.state === "warn" && <p className="mt-2 text-xs font-medium text-amber-700">You have used over 80% of your plan limit.</p>}
      {lvl.state === "over" && <p className="mt-2 text-xs font-medium text-red-700">You are past your plan limit. Extra usage may be charged.</p>}
      {lvl.state === "unset" && <p className="mt-2 text-xs text-neutral-500">Enter your plan's included {unitLabel} to see how much is left.</p>}
      <div className="mt-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)} placeholder={`Included ${unitLabel}`} className="h-8 w-48" />
            <Button size="sm" onClick={async () => { await onSaveLimit(val); setEditing(false); }}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-rose-700 underline">
            {limit ? "Change plan limit" : "Set plan limit"}
          </button>
        )}
      </div>
    </div>
  );
}

export function DailyBars({ rows, format }: { rows: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-neutral-500">No activity in this period.</p>;
  return (
    <div className="flex h-40 items-end gap-1">
      {rows.map((r) => (
        <div key={r.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${r.label}: ${format(r.value)}`}>
          <div className="w-full rounded-t bg-rose-500" style={{ height: `${(r.value / max) * 100}%`, minHeight: r.value > 0 ? 2 : 0 }} />
        </div>
      ))}
    </div>
  );
}
