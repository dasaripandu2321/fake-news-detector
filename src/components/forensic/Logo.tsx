import { ScanSearch } from "lucide-react";

export const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-secondary border border-border">
      <ScanSearch className="h-5 w-5 text-emerald" strokeWidth={2.25} />
      <span className="absolute inset-0 rounded-lg ring-1 ring-emerald/30 animate-pulse-glow" />
    </div>
    <div className="leading-tight">
      <div className="text-base font-semibold tracking-tight">Vigilant<span className="text-emerald">·AI</span></div>
      <div className="mono text-[10px] uppercase text-muted-foreground">Forensic Misinformation Lab</div>
    </div>
  </div>
);