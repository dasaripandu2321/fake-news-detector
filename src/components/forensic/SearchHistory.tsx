import { motion, AnimatePresence } from "framer-motion";
import { History, ShieldAlert, ShieldCheck, Trash2, RotateCcw, Clock } from "lucide-react";
import type { ForensicReport } from "@/lib/forensic";

export interface HistoryEntry {
  id: string;
  specimen: string;
  mode: "url" | "text";
  timestamp: number;
  report: ForensicReport;
}

const STORAGE_KEY = "vigilant_history";

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, "id">) {
  const history = loadHistory();
  const newEntry: HistoryEntry = { ...entry, id: crypto.randomUUID() };
  // Keep latest 20 entries
  const updated = [newEntry, ...history].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

interface SearchHistoryProps {
  history: HistoryEntry[];
  onRerun: (entry: HistoryEntry) => void;
  onClear: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const SearchHistory = ({ history, onRerun, onClear }: SearchHistoryProps) => {
  if (history.length === 0) return null;

  return (
    <section id="history" className="container py-16">
      {/* Section header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-emerald">// Your Session</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Search History</h2>
          <p className="mt-2 text-muted-foreground">
            {history.length} scan{history.length !== 1 ? "s" : ""} · stored locally in your browser
          </p>
        </div>
        <button
          onClick={onClear}
          className="mono inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" /> Clear All
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {history.map((entry, i) => {
            const isFake = entry.report.is_fake;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="glass group relative overflow-hidden rounded-2xl px-5 py-4 transition-all hover:border-emerald/30"
              >
                {/* Subtle left accent bar */}
                <div
                  className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${
                    isFake ? "bg-destructive/70" : "bg-emerald/70"
                  }`}
                />

                <div className="flex items-center gap-4 pl-2">
                  {/* Verdict icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      isFake
                        ? "border-destructive/30 bg-destructive/10"
                        : "border-emerald/30 bg-emerald/10"
                    }`}
                  >
                    {isFake ? (
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald" />
                    )}
                  </div>

                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`mono text-[10px] font-bold uppercase tracking-widest ${
                          isFake ? "text-destructive" : "text-emerald"
                        }`}
                      >
                        {isFake ? "Fake" : "Real"}
                      </span>
                      <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        · {entry.mode === "url" ? "URL" : "Text"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {entry.specimen}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.report.verdict}
                    </p>
                  </div>

                  {/* Score pills */}
                  <div className="hidden shrink-0 items-center gap-2 md:flex">
                    <ScoreMini label="Fact" value={entry.report.scores.factuality} good />
                    <ScoreMini label="Bias" value={entry.report.scores.bias} good={false} />
                  </div>

                  {/* Time + rerun */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="mono flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeAgo(entry.timestamp)}
                    </div>
                    <button
                      onClick={() => onRerun(entry)}
                      className="mono inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:border-emerald/40 hover:text-emerald"
                    >
                      <RotateCcw className="h-3 w-3" /> Re-scan
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
};

const ScoreMini = ({ label, value, good }: { label: string; value: number; good: boolean }) => {
  const positive = good ? value >= 60 : value < 40;
  return (
    <div
      className={`rounded-lg border px-2.5 py-1 text-center ${
        positive
          ? "border-emerald/20 bg-emerald/5"
          : "border-destructive/20 bg-destructive/5"
      }`}
    >
      <div className={`mono text-xs font-bold ${positive ? "text-emerald" : "text-destructive"}`}>
        {value}
      </div>
      <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
};
