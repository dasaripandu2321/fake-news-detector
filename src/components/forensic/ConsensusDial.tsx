import { useEffect, useRef } from "react";

interface DialProps {
  factuality: number; // 0-100
  bias: number;
  intent: number;
}

const Needle = ({ value, color, delay }: { value: number; color: string; delay: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  // map 0-100 → -90deg to 90deg
  const angle = -90 + (value / 100) * 180;
  useEffect(() => {
    if (ref.current) ref.current.style.setProperty("--target-angle", `${angle}deg`);
  }, [angle]);
  return (
    <div
      ref={ref}
      className="absolute bottom-0 left-1/2 h-[42%] w-0.5 origin-bottom animate-needle"
      style={{ background: color, animationDelay: `${delay}ms`, boxShadow: `0 0 10px ${color}` }}
    >
      <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: color }} />
    </div>
  );
};

export const ConsensusDial = ({ factuality, bias, intent }: DialProps) => {
  return (
    <div className="glass-strong rounded-2xl p-6">
      <div className="mono mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        Consensus Dial · 3-needle reading
      </div>
      <div className="relative mx-auto mt-2 flex h-44 w-72 items-end justify-center">
        {/* Arc */}
        <svg viewBox="0 0 200 110" className="absolute inset-x-0 top-0 h-full w-full">
          <defs>
            <linearGradient id="arcGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="hsl(0 84% 60%)" />
              <stop offset="50%" stopColor="hsl(38 95% 55%)" />
              <stop offset="100%" stopColor="hsl(152 76% 44%)" />
            </linearGradient>
          </defs>
          <path d="M10 100 A 90 90 0 0 1 190 100" fill="none" stroke="url(#arcGrad)" strokeWidth="2" opacity="0.9" />
          <path d="M10 100 A 90 90 0 0 1 190 100" fill="none" stroke="hsl(var(--border))" strokeWidth="14" opacity="0.25" />
          {/* tick marks */}
          {Array.from({ length: 21 }).map((_, i) => {
            const a = (Math.PI * i) / 20;
            const x1 = 100 - Math.cos(a) * 88;
            const y1 = 100 - Math.sin(a) * 88;
            const x2 = 100 - Math.cos(a) * 80;
            const y2 = 100 - Math.sin(a) * 80;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity={i % 5 === 0 ? 0.8 : 0.3} />;
          })}
        </svg>
        <div className="relative h-[88%] w-[88%]">
          <Needle value={factuality} color="hsl(var(--emerald-glow))" delay={100} />
          <Needle value={100 - bias} color="hsl(var(--warning))" delay={300} />
          <Needle value={100 - intent} color="hsl(var(--destructive))" delay={500} />
          <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground shadow-[0_0_10px_hsl(var(--emerald)/0.6)]" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          { l: "Factuality", v: factuality, c: "text-emerald" },
          { l: "Bias", v: bias, c: "text-warning" },
          { l: "Intent", v: intent, c: "text-destructive" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border/60 bg-secondary/40 p-2">
            <div className={`mono text-lg font-bold ${s.c}`}>{s.v}<span className="text-xs text-muted-foreground">/100</span></div>
            <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};