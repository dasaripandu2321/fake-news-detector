import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

const LINES = [
  "› init forensic-engine v3.2 …",
  "› analyzing linguistic markers …",
  "› tracing IP provenance via WHOIS lattice …",
  "› cross-referencing claim against 14 fact-corpora …",
  "› detecting psychological trigger vectors …",
  "› running semantic mismatch on headline ↔ body …",
  "› temporal anomaly check (waveform Δ) …",
  "› compiling motive heatmap …",
  "› signing forensic report …",
];

export const ScanTerminal = () => {
  const [shown, setShown] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setShown((prev) => [...prev, LINES[i % LINES.length]]);
      i++;
    }, 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-emerald" />
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          forensic.stream
        </span>
        <div className="ml-auto flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
        </div>
      </div>
      <div className="mono max-h-40 overflow-hidden p-4 text-xs leading-relaxed text-emerald/90">
        {shown.slice(-6).map((l, i) => (
          <div key={i} className="animate-fade-in">
            {l}
            {i === shown.slice(-6).length - 1 && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-emerald align-middle" />}
          </div>
        ))}
      </div>
    </div>
  );
};