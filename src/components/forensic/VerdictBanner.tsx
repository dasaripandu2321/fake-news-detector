import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Newspaper, CheckCircle2, XCircle } from "lucide-react";
import type { ForensicReport } from "@/lib/forensic";

interface VerdictBannerProps {
  report: ForensicReport;
}

export const VerdictBanner = ({ report }: VerdictBannerProps) => {
  const isFake = report.is_fake;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-4xl space-y-4"
      >
        {/* ── Main verdict card ── */}
        <div
          className={`relative overflow-hidden rounded-3xl border-2 ${
            isFake ? "border-destructive/50" : "border-emerald/50"
          }`}
        >
          {/* Background glow */}
          <div
            className={`absolute inset-0 opacity-[0.07] ${
              isFake
                ? "bg-gradient-to-br from-destructive via-destructive/50 to-transparent"
                : "bg-gradient-to-br from-emerald via-emerald/50 to-transparent"
            }`}
          />

          <div className="relative flex flex-col items-center gap-6 px-8 py-10 text-center md:flex-row md:text-left">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 14 }}
              className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 ${
                isFake
                  ? "border-destructive/40 bg-destructive/15 shadow-[0_0_40px_hsl(0_84%_60%/0.2)]"
                  : "border-emerald/40 bg-emerald/15 shadow-[0_0_40px_hsl(152_76%_44%/0.2)]"
              }`}
            >
              {isFake ? (
                <ShieldAlert className="h-12 w-12 text-destructive" />
              ) : (
                <ShieldCheck className="h-12 w-12 text-emerald" />
              )}
            </motion.div>

            {/* Text */}
            <div className="flex-1">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Forensic Verdict
              </div>
              <h2
                className={`mt-1 text-5xl font-black tracking-tight md:text-6xl ${
                  isFake ? "text-destructive" : "text-emerald"
                }`}
              >
                {isFake ? "FAKE NEWS" : "REAL NEWS"}
              </h2>
              <p className="mt-2 text-base text-muted-foreground">{report.verdict}</p>
            </div>

            {/* Score block */}
            <div className="flex shrink-0 flex-row gap-3 md:flex-col">
              <ScoreBlock label="Factuality" value={report.scores.factuality} good />
              <ScoreBlock label="Bias" value={report.scores.bias} good={false} />
              <ScoreBlock label="Manipulation" value={report.scores.intent} good={false} />
            </div>
          </div>
        </div>

        {/* ── Real news correction (fake only) ── */}
        {isFake && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-3xl border border-emerald/25 bg-emerald/5 p-6"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald/30 bg-emerald/10">
                <Newspaper className="h-4 w-4 text-emerald" />
              </div>
              <div>
                <div className="mono text-[10px] uppercase tracking-widest text-emerald">
                  What the real story is
                </div>
                <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Factual correction · powered by Gemini
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{report.real_news}</p>
          </motion.div>
        )}

        {/* ── Confirmed real ── */}
        {!isFake && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-3xl border border-emerald/25 bg-emerald/5 p-5"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald" />
              <p className="text-sm text-foreground/80">{report.real_news}</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const ScoreBlock = ({ label, value, good }: { label: string; value: number; good: boolean }) => {
  const positive = good ? value >= 60 : value < 40;
  const barColor = positive ? "bg-emerald" : value > 70 ? "bg-destructive" : "bg-warning";

  return (
    <div className="w-28 rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
      <div className={`mono text-xl font-bold ${positive ? "text-emerald" : value > 70 ? "text-destructive" : "text-warning"}`}>
        {value}
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className={`h-full ${barColor}`}
        />
      </div>
      <div className="mono mt-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
};
