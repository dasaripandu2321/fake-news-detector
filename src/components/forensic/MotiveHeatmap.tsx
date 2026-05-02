import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Flame } from "lucide-react";
import type { ForensicReport } from "@/lib/forensic";

const sevColor = {
  low: "decoration-warning/40 bg-warning/5 hover:bg-warning/15",
  med: "decoration-warning bg-warning/10 hover:bg-warning/20 text-warning",
  high: "decoration-destructive bg-destructive/10 hover:bg-destructive/20 text-destructive",
};

const PLACEHOLDER = `Run a forensic scan above. The Smart Reader will surface flagged passages from the specimen — hover any highlight to expose the manipulation technique behind it.`;

type Segment =
  | { kind: "plain"; text: string }
  | {
      kind: "flag";
      text: string;
      fallacy: string;
      explanation: string;
      severity: "low" | "med" | "high";
    };

function buildSegments(text: string, findings: ForensicReport["forensic_findings"]): Segment[] {
  if (!findings.length) return [{ kind: "plain", text }];
  type Match = { start: number; end: number; f: ForensicReport["forensic_findings"][number] };
  const matches: Match[] = [];
  for (const f of findings) {
    if (!f.snippet) continue;
    const idx = text.toLowerCase().indexOf(f.snippet.toLowerCase());
    if (idx === -1) continue;
    matches.push({ start: idx, end: idx + f.snippet.length, f });
  }
  matches.sort((a, b) => a.start - b.start);
  // De-overlap: keep first, drop overlapping later ones.
  const filtered: Match[] = [];
  for (const m of matches) {
    if (filtered.length === 0 || m.start >= filtered[filtered.length - 1].end) filtered.push(m);
  }
  const segs: Segment[] = [];
  let cur = 0;
  for (const m of filtered) {
    if (m.start > cur) segs.push({ kind: "plain", text: text.slice(cur, m.start) });
    segs.push({
      kind: "flag",
      text: text.slice(m.start, m.end),
      fallacy: m.f.fallacy,
      explanation: m.f.explanation,
      severity: m.f.severity,
    });
    cur = m.end;
  }
  if (cur < text.length) segs.push({ kind: "plain", text: text.slice(cur) });
  return segs;
}

interface Props {
  report: ForensicReport | null;
}

export const MotiveHeatmap = ({ report }: Props) => {
  const text = report?.representative_text?.trim() || PLACEHOLDER;
  const findings = report?.forensic_findings ?? [];
  const segments = buildSegments(text, findings);

  return (
  <TooltipProvider delayDuration={120}>
    <div className="glass-strong rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Motive Heatmap · Smart Reader
          </div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">
            {report ? "Hover any flagged passage to expose the manipulation technique" : "Smart Reader idle"}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-warning" /> <span className="text-muted-foreground">Suggestive</span></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-destructive" /> <span className="text-muted-foreground">Manipulative</span></span>
        </div>
      </div>

      <p className="text-base leading-loose">
        {segments.map((s, i) =>
          s.kind === "flag" ? (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span
                  className={`mx-0.5 inline rounded-sm px-1 py-0.5 underline decoration-2 underline-offset-4 transition-colors cursor-help ${sevColor[s.severity]}`}
                >
                  {s.text}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs border-emerald/30 bg-popover/95 backdrop-blur-md">
                <div className="flex items-center gap-1.5 mono text-[10px] uppercase tracking-widest text-emerald">
                  {s.severity === "high" ? <Flame className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {s.fallacy}
                </div>
                <p className="mt-1 text-xs leading-snug text-foreground">{s.explanation}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={i}>{s.text}</span>
          )
        )}
      </p>
      {report && findings.length === 0 && (
        <div className="mono mt-4 text-[11px] text-emerald">
          ✓ No manipulation patterns detected in this specimen.
        </div>
      )}
    </div>
  </TooltipProvider>
  );
};