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
      <div className="border-2 border-black px-4 py-3 text-sm font-medium dark:border-[#2a2a2a]">
        ⚠️ The following players are ineligible — Anthony Edwards, Steph Curry, Devin Booker, LeBron James.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5" htmlFor="awards-mvp">
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
            className="w-full border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold dark:border-white dark:bg-[#1a1a1a] dark:text-white"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5" htmlFor="awards-roy">
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
            className="w-full border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold dark:border-white dark:bg-[#1a1a1a] dark:text-white"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5" htmlFor="awards-mip">
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
            className="w-full border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold dark:border-white dark:bg-[#1a1a1a] dark:text-white"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5" htmlFor="awards-smoy">
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
            className="w-full border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold dark:border-white dark:bg-[#1a1a1a] dark:text-white"
            placeholder="Player name"
          />
        </div>
        <div>
          <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5" htmlFor="awards-coy">
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
            className="w-full border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold dark:border-white dark:bg-[#1a1a1a] dark:text-white"
            placeholder="Coach name"
          />
        </div>
        <div>
          <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5" htmlFor="awards-dpoy">
            Defensive Player of the Year
          </label>
          <input
            id="awards-dpoy"
            type="text"
            value="Victor Wembanyama"
            readOnly
            disabled
            className="w-full border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold opacity-40 cursor-not-allowed"
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
          className="bg-black text-white px-5 py-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em] disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit awards picks"}
        </button>

        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        {success && (
          <p className="text-sm font-bold text-accent">Awards picks saved!</p>
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
    <section className="border-[3px] border-black p-5 space-y-3 dark:border-[#2a2a2a]">
      <h3 className="text-[0.65rem] font-extrabold text-muted uppercase tracking-[0.12em] border-b-2 border-black pb-2.5 dark:border-[#2a2a2a]">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        {players.map((value, i) => (
          <label key={i} className="block">
            <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5">
              Player {i + 1}
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(i, e.target.value)}
              maxLength={60}
              className="w-full border-2 border-black rounded-none bg-white px-2 py-1.5 text-sm font-bold dark:border-white dark:bg-[#1a1a1a] dark:text-white"
              placeholder="Player name"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
