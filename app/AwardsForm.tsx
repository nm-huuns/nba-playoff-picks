"use client";

import { useState } from "react";

const TEAM_SIZE = 5;

type TeamKey = "first" | "second" | "third";

interface AllNbaState {
  first: string[];
  second: string[];
  third: string[];
}

const emptyTeam = (): string[] => Array.from({ length: TEAM_SIZE }, () => "");

const TEAM_LABELS: Record<TeamKey, string> = {
  first: "All-NBA 1st team",
  second: "All-NBA 2nd team",
  third: "All-NBA 3rd team",
};

export default function AwardsForm({ name }: { name: string }) {
  const [mvp, setMvp] = useState("");
  const [roy, setRoy] = useState("");
  const [mip, setMip] = useState("");
  const [smoy, setSmoy] = useState("");
  const [coy, setCoy] = useState("");
  const [allNBA, setAllNBA] = useState<AllNbaState>({
    first: emptyTeam(),
    second: emptyTeam(),
    third: emptyTeam(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  function setTeamPlayer(key: TeamKey, index: number, value: string) {
    setAllNBA((prev) => {
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
    setSuccess(false);
    setError(null);
  }

  function findMissing(): string | null {
    if (!name.trim()) return "Please enter your name";
    if (!mvp.trim()) return "Enter your MVP pick";
    if (!roy.trim()) return "Enter your Rookie of the Year pick";
    if (!mip.trim()) return "Enter your Most Improved Player pick";
    if (!smoy.trim()) return "Enter your Sixth Man of the Year pick";
    if (!coy.trim()) return "Enter your Coach of the Year pick";
    for (const key of ["first", "second", "third"] as TeamKey[]) {
      for (let i = 0; i < TEAM_SIZE; i++) {
        if (!allNBA[key][i].trim()) {
          return `Enter ${TEAM_LABELS[key]} player #${i + 1}`;
        }
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = findMissing();
    if (missing) {
      setError(missing);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const body = {
      name: name.trim(),
      mvp: mvp.trim(),
      roy: roy.trim(),
      mip: mip.trim(),
      smoy: smoy.trim(),
      coy: coy.trim(),
      allNBA: {
        first: allNBA.first.map((s) => s.trim()),
        second: allNBA.second.map((s) => s.trim()),
        third: allNBA.third.map((s) => s.trim()),
      },
    };

    try {
      const res = await fetch("/api/submit/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Submission failed");
      } else {
        setSuccess(true);
        setMvp("");
        setRoy("");
        setMip("");
        setSmoy("");
        setCoy("");
        setAllNBA({
          first: emptyTeam(),
          second: emptyTeam(),
          third: emptyTeam(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="awards-mvp">
            MVP
          </label>
          <input
            id="awards-mvp"
            type="text"
            value={mvp}
            onChange={(e) => {
              setMvp(e.target.value);
              setSuccess(false);
              setError(null);
            }}
            maxLength={60}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="awards-roy">
            Rookie of the Year
          </label>
          <input
            id="awards-roy"
            type="text"
            value={roy}
            onChange={(e) => {
              setRoy(e.target.value);
              setSuccess(false);
              setError(null);
            }}
            maxLength={60}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="awards-mip">
            Most Improved Player
          </label>
          <input
            id="awards-mip"
            type="text"
            value={mip}
            onChange={(e) => {
              setMip(e.target.value);
              setSuccess(false);
              setError(null);
            }}
            maxLength={60}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="awards-smoy">
            Sixth Man of the Year
          </label>
          <input
            id="awards-smoy"
            type="text"
            value={smoy}
            onChange={(e) => {
              setSmoy(e.target.value);
              setSuccess(false);
              setError(null);
            }}
            maxLength={60}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="awards-coy">
            Coach of the Year
          </label>
          <input
            id="awards-coy"
            type="text"
            value={coy}
            onChange={(e) => {
              setCoy(e.target.value);
              setSuccess(false);
              setError(null);
            }}
            maxLength={60}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Coach name"
          />
        </div>
      </div>

      <div className="space-y-6">
        {(["first", "second", "third"] as TeamKey[]).map((key) => (
          <TeamSection
            key={key}
            title={TEAM_LABELS[key]}
            players={allNBA[key]}
            onChange={(index, value) => setTeamPlayer(key, index, value)}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black text-white px-5 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit awards picks"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-green-700 dark:text-green-400">Awards picks saved!</p>
        )}
      </div>
    </form>
  );
}

function TeamSection({
  title,
  players,
  onChange,
}: {
  title: string;
  players: string[];
  onChange: (index: number, value: string) => void;
}) {
  return (
    <section className="rounded border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        {players.map((value, i) => (
          <label key={i} className="block">
            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Player {i + 1}
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(i, e.target.value)}
              maxLength={60}
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
              placeholder="Player name"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
