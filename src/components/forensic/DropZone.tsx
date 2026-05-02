import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Sparkles, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanTerminal } from "./ScanTerminal";
import { toast } from "sonner";
import { runGeminiScan } from "@/lib/forensic";
import type { ForensicReport } from "@/lib/forensic";

interface DropZoneProps {
  onScanComplete: (report: ForensicReport, specimen: string, mode: "url" | "text") => void;
  scanning: boolean;
  setScanning: (v: boolean) => void;
}

export const DropZone = ({ onScanComplete, scanning, setScanning }: DropZoneProps) => {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"url" | "text">("url");

  const handleScan = async () => {
    if (!input.trim()) return;
    setScanning(true);
    try {
      const report = await runGeminiScan(input.trim(), mode);
      onScanComplete(report, input.trim(), mode);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Forensic scan failed. Try again.";
      const isQuota = msg.toLowerCase().includes("rate-limited") || msg.toLowerCase().includes("quota");
      toast.error(
        isQuota
          ? "All Gemini models are rate-limited right now. Please wait ~1 minute and try again."
          : msg,
        { duration: 8000 }
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-center gap-2">
          {(["url", "text"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`mono inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition-all ${
                mode === m
                  ? "border-emerald/50 bg-emerald/10 text-emerald"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "url" ? <Link2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {m === "url" ? "URL Specimen" : "Text Specimen"}
            </button>
          ))}
        </div>

        <motion.div
          layout
          className={`glass-strong relative overflow-hidden rounded-2xl p-1 shadow-[var(--shadow-card)] ${
            scanning ? "scanline" : ""
          }`}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald/30 via-transparent to-emerald/20 opacity-40" />
          <div className="relative rounded-[15px] bg-card/80 p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {scanning ? "// Specimen locked — running diagnostics" : "// Drop specimen for forensic analysis"}
              </div>
              <div className="mono text-[10px] text-emerald">{scanning ? "ACTIVE" : "IDLE"}</div>
            </div>

            {mode === "url" ? (
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://example.com/article-to-investigate"
                disabled={scanning}
                className="w-full bg-transparent font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            ) : (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste any headline, claim, or article text here…"
                rows={3}
                disabled={scanning}
                className="w-full resize-none bg-transparent font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            )}

            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5" />
                <span>or drag a file · PDF, image, audio</span>
              </div>
              <Button
                onClick={handleScan}
                disabled={scanning || !input.trim()}
                className="bg-gradient-to-r from-emerald to-emerald-glow text-primary-foreground shadow-[var(--shadow-elev)] hover:opacity-95"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {scanning ? "Scanning…" : "Run Forensic Scan"}
              </Button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {scanning && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4"
            >
              <ScanTerminal />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
