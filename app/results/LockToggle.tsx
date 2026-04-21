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
    <div className="rounded border border-gray-200 dark:border-gray-800 p-3 flex items-center gap-4 flex-wrap">
      <div className="text-sm min-w-40">
        <span className="text-gray-500">{label}: </span>
        <strong className={locked ? "text-red-600" : "text-green-700 dark:text-green-400"}>
          {locked ? "Locked" : "Open"}
        </strong>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="rounded bg-black text-white px-3 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
      >
        {busy ? "…" : locked ? "Unlock" : "Lock"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
