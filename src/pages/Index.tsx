import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, GitBranch, MessagesSquare, AudioWaveform, ShieldCheck } from "lucide-react";
import { Header } from "@/components/forensic/Header";
import { DropZone } from "@/components/forensic/DropZone";
import { LensCard } from "@/components/forensic/LensCard";
import { ConsensusDial } from "@/components/forensic/ConsensusDial";
import { MotiveHeatmap } from "@/components/forensic/MotiveHeatmap";
import { VerdictBanner } from "@/components/forensic/VerdictBanner";
import { SearchHistory, loadHistory, saveToHistory, clearHistory } from "@/components/forensic/SearchHistory";
import type { HistoryEntry } from "@/components/forensic/SearchHistory";
import type { ForensicReport } from "@/lib/forensic";

const ACCENT_BARS = ["bg-destructive", "bg-warning", "bg-emerald", "bg-foreground/70"] as const;

const Index = () => {
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentSpecimen, setCurrentSpecimen] = useState("");
  const [currentMode, setCurrentMode] = useState<"url" | "text">("url");
  const scanned = report !== null;

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleScanComplete = (r: ForensicReport, specimen: string, mode: "url" | "text") => {
    setReport(r);
    setCurrentSpecimen(specimen);
    setCurrentMode(mode);
    const updated = saveToHistory({ specimen, mode, timestamp: Date.now(), report: r });
    setHistory(updated);
    // Scroll to verdict
    setTimeout(() => document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleRerun = (entry: HistoryEntry) => {
    setReport(entry.report);
    setCurrentSpecimen(entry.specimen);
    setCurrentMode(entry.mode);
    setTimeout(() => document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* ── Hero / Lab ── */}
      <section id="lab" className="container relative pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mono mb-5 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/5 px-3 py-1 text-[10px] uppercase tracking-widest text-emerald">
            <ShieldCheck className="h-3 w-3" /> Forensic Misinformation Lab · v3.2
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            A digital microscope for the news you read.
          </h1>
          <p className="mt-5 text-pretty text-lg text-muted-foreground">
            Vigilant·AI dissects any URL or claim under four forensic lenses — exposing intent, provenance, semantic mismatch and temporal anomalies in seconds.
          </p>
        </motion.div>

        <div className="mt-12">
          <DropZone
            scanning={scanning}
            setScanning={setScanning}
            onScanComplete={handleScanComplete}
          />
        </div>
      </section>

      {/* ── Verdict Banner ── */}
      {scanned && (
        <section id="verdict" className="container pb-4 pt-2">
          <VerdictBanner report={report!} />
        </section>
      )}

      {/* ── Forensic Lenses ── */}
      <section id="lenses" className="container py-12">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-emerald">// Analysis Engine</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">The four forensic lenses</h2>
          </div>
          <div className="mono hidden text-xs text-muted-foreground md:block">
            {scanned ? `Verdict · ${report!.verdict}` : "Awaiting specimen"}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <LensCard
            icon={Brain}
            title="Tactical Intent"
            subtitle="Psychological triggers: fear, urgency, bias vectors."
            index={0}
            scanned={scanned}
            accent="destructive"
          >
            <div className="space-y-3">
              {(report?.tactical_intent ?? []).map((b, i) => (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{b.label}</span><span>{b.strength}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.strength}%` }}
                      transition={{ duration: 0.9, delay: 0.2 }}
                      className={`h-full ${ACCENT_BARS[i % ACCENT_BARS.length]}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </LensCard>

          <LensCard
            icon={GitBranch}
            title="Provenance Trace"
            subtitle="Theoretical origin lineage of the story."
            index={1}
            scanned={scanned}
            accent="emerald"
          >
            <ol className="relative ml-3 space-y-3 border-l border-border/60 pl-5">
              {(report?.provenance_trace ?? []).map((s, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-emerald shadow-[0_0_10px_hsl(var(--emerald))]" />
                  <div className="text-sm">{s.step}</div>
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.time_marker}</div>
                </li>
              ))}
            </ol>
          </LensCard>

          <LensCard
            icon={MessagesSquare}
            title="Semantic Mismatch"
            subtitle="Headline vs. body text contradictions."
            index={2}
            scanned={scanned}
            accent="warning"
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="mono text-[10px] uppercase tracking-widest text-warning">Headline</div>
                <p className="mt-1 text-sm">{report?.semantic_mismatch.headline}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Body Excerpt</div>
                <p className="mt-1 text-sm text-muted-foreground">{report?.semantic_mismatch.body_excerpt}</p>
              </div>
              <div className="mono text-[11px] text-warning">
                ⚠ {report?.semantic_mismatch.note} · confidence {report?.semantic_mismatch.confidence.toFixed(2)}
              </div>
            </div>
          </LensCard>

          <LensCard
            icon={AudioWaveform}
            title="Temporal Anomaly"
            subtitle="Waveform of neural-stress markers across audio/video."
            index={3}
            scanned={scanned}
            accent="primary"
          >
            <div className="flex h-24 items-end gap-1">
              {Array.from({ length: 48 }).map((_, i) => {
                const stress = Math.sin(i / 3) * 0.5 + 0.5 + (i > 28 && i < 36 ? 0.4 : 0);
                const h = Math.min(100, Math.max(8, stress * 100));
                const high = i > 28 && i < 36;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 4 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.2 + i * 0.012, duration: 0.4 }}
                    className={`w-1.5 rounded-sm ${high ? "bg-destructive" : "bg-emerald/70"}`}
                  />
                );
              })}
            </div>
            <div className="mt-3 mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Stress spike · 00:14–00:18 · synthetic cadence suspected
            </div>
          </LensCard>
        </div>

        {/* ── Dial + Heatmap ── */}
        <div className="mt-10 grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ConsensusDial
              factuality={report?.scores.factuality ?? 0}
              bias={report?.scores.bias ?? 0}
              intent={report?.scores.intent ?? 0}
            />
          </div>
          <div className="lg:col-span-3">
            <MotiveHeatmap report={report} />
          </div>
        </div>
      </section>

      {/* ── Search History ── */}
      <SearchHistory
        history={history}
        onRerun={handleRerun}
        onClear={handleClearHistory}
      />

      <footer id="method" className="border-t border-border/60 py-10">
        <div className="container flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Vigilant·AI · Forensic Misinformation Lab · © 2026
          </div>
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Method · Adversarial-NLP × Provenance Graph × Multimodal Stress Detection
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
