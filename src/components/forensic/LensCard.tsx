import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface LensCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  index: number;
  scanned: boolean;
  children: ReactNode;
  accent?: "emerald" | "warning" | "destructive" | "primary";
}

const accentMap = {
  emerald: "text-emerald border-emerald/30 bg-emerald/5",
  warning: "text-warning border-warning/30 bg-warning/5",
  destructive: "text-destructive border-destructive/30 bg-destructive/5",
  primary: "text-foreground border-border bg-secondary/40",
};

export const LensCard = ({ icon: Icon, title, subtitle, index, scanned, children, accent = "emerald" }: LensCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:border-emerald/40"
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald/10 blur-3xl opacity-0 transition-opacity group-hover:opacity-100" />
    <div className="flex items-start justify-between">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${accentMap[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Lens · 0{index + 1}
      </span>
    </div>
    <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-5 border-t border-border/60 pt-5">
      {scanned ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {children}
        </motion.div>
      ) : (
        <div className="mono flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          Awaiting specimen…
        </div>
      )}
    </div>
  </motion.div>
);