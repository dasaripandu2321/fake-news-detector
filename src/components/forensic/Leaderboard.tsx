import { TrendingUp, Globe2 } from "lucide-react";

const ROWS = [
  { rank: 1, claim: "“Vaccine microchips” conspiracy resurface", region: "US · EU", score: 92, delta: "+18%" },
  { rank: 2, claim: "Fabricated celebrity AI endorsement scam", region: "Global", score: 88, delta: "+24%" },
  { rank: 3, claim: "Election fraud video (deepfake confirmed)", region: "BR", score: 81, delta: "+11%" },
  { rank: 4, claim: "Climate ‘scientists admit hoax’ fabrication", region: "US · AU", score: 76, delta: "+6%" },
  { rank: 5, claim: "Bogus cancer ‘miracle cure’ herbal post", region: "IN · UK", score: 71, delta: "+9%" },
];

export const Leaderboard = () => (
  <section id="leaderboard" className="container py-24">
    <div className="mb-10 flex items-end justify-between">
      <div>
        <div className="mono text-[10px] uppercase tracking-widest text-emerald">Live · Global Lab</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Misinformation Leaderboard</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Cross-correlated trending fabrications, ranked by virality × deception severity. Updated continuously by the engine.
        </p>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 mono text-[10px] uppercase tracking-widest text-muted-foreground md:inline-flex">
        <Globe2 className="h-3 w-3 text-emerald" /> 1,284 specimens · last 24h
      </div>
    </div>

    <div className="glass overflow-hidden rounded-2xl">
      <div className="grid grid-cols-12 border-b border-border/60 bg-secondary/30 px-6 py-3 mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <div className="col-span-1">#</div>
        <div className="col-span-7">Specimen</div>
        <div className="col-span-2">Region</div>
        <div className="col-span-1 text-right">Score</div>
        <div className="col-span-1 text-right">Δ 24h</div>
      </div>
      {ROWS.map((r) => (
        <div key={r.rank} className="grid grid-cols-12 items-center border-b border-border/40 px-6 py-4 transition-colors hover:bg-emerald/5 last:border-b-0">
          <div className="col-span-1 mono text-emerald">0{r.rank}</div>
          <div className="col-span-7 font-medium">{r.claim}</div>
          <div className="col-span-2 mono text-xs text-muted-foreground">{r.region}</div>
          <div className="col-span-1 text-right">
            <span className="mono inline-block rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{r.score}</span>
          </div>
          <div className="col-span-1 flex items-center justify-end gap-1 text-xs text-emerald">
            <TrendingUp className="h-3 w-3" /> {r.delta}
          </div>
        </div>
      ))}
    </div>
  </section>
);