"use client";

import { useState } from "react";
import type { LockKind, LockState } from "@/lib/lock";

export default function LockToggle({
  kind,
  label,
  initialLocked,
}: {
  kind: LockKind;
  label: string;
  initialLocked: boolean;
}) {
  const [locked, setLocked] = useState(initialLocked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const verb = locked ? "Unlock" : "Lock";
    if (
      !window.confirm(
        `${verb} ${label} picks? This will ${locked ? "re-open" : "close"} submissions for this section.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = (await res.json()) as Partial<LockState> & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Toggle failed");
      } else if (typeof data[kind] === "boolean") {
        setLocked(data[kind] as boolean);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-2 border-black p-3 dark:border-[#2a2a2a] flex flex-col items-center gap-2">
      <div className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-muted">{label}</div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className={`relative w-11 h-6 rounded-full border-2 transition-colors ${
          locked ? "border-red-500" : "border-green-400"
        }`}>
          <div className={`absolute top-[2px] w-4 h-4 rounded-full transition-transform duration-200 ${
            locked ? "translate-x-[21px] bg-red-500" : "translate-x-[3px] bg-green-400"
          }`} />
        </div>
        <span className={`text-[0.65rem] font-extrabold uppercase tracking-[0.1em] ${
          locked ? "text-red-500" : "text-green-400"
        }`}>
          {busy ? "…" : locked ? "Locked" : "Unlocked"}
        </span>
      </button>
      {error && <p className="text-xs font-bold text-red-600 mt-1">{error}</p>}
    </div>
  );
}
