import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { Search, Link2, Trash2, Clock, ChevronRight, Shield, Zap, AlertTriangle, CheckCircle, Copy, Download, ExternalLink, Menu, X } from "lucide-react";

const API = "http://localhost:8000";
const MAX_HISTORY = 8;

const FAKE_EXAMPLES = [
  { label: "Miracle Cure Cover-Up", text: "SHOCKING BOMBSHELL: Secret Government Documents LEAKED\n\nA brave whistleblower has come forward with explosive leaked documents revealing a massive conspiracy the mainstream media REFUSES to cover. Deep state operatives have been suppressing a miracle cure for cancer that pharmaceutical companies have kept hidden for decades.\n\nBig Pharma has spent billions bribing corrupt officials. Wake up, sheeple. Share this before they delete it. The agenda to keep you sick is real. Rigged elections, stolen freedoms — the corrupt establishment must be held accountable." },
  { label: "Election Fraud Conspiracy", text: "BREAKING: Explosive Leaked Emails PROVE Massive Election Fraud\n\nBombshell documents reveal the 2024 election was stolen through a coordinated deep state operation involving foreign governments and globalist billionaires who rigged voting machines across swing states.\n\nThousands of fraudulent ballots were inserted in the dead of night. The entire system is corrupt from top to bottom. Share this before they delete it." },
  { label: "5G Mind Control Plot", text: "URGENT ALERT: 5G Towers Are Being Used to Control the Population\n\nA government insider has come forward with explosive evidence that 5G towers are a secret program to control human behavior and suppress dissent. The documents reveal 5G frequencies transmit signals that affect brain chemistry.\n\nWake up before it is too late. Share this everywhere before they delete it." },
  { label: "Vaccine Microchip Hoax", text: "EXCLUSIVE: Bill Gates Admits Vaccines Contain Microchips in Secret Recording\n\nA bombshell recording has emerged in which Bill Gates admits COVID-19 vaccines contain microscopic tracking chips. The microchips are activated by 5G towers and transmit location data to globalist elites.\n\nThis is the most important story you will ever read. Share it before they delete it." },
];

const REAL_EXAMPLES = [
  { label: "Federal Reserve Rate Hike", text: "Federal Reserve Raises Interest Rates by 25 Basis Points\n\nWASHINGTON — The Federal Reserve raised its benchmark interest rate by a quarter percentage point on Wednesday, according to an official announcement from the central bank. The decision was unanimous among voting members of the Federal Open Market Committee, bringing the federal funds rate to a target range of 5.25 to 5.5 percent, the highest level in more than two decades.\n\nFed Chair Jerome Powell said at a press conference that officials would continue to monitor incoming economic data before deciding whether further rate increases are warranted." },
  { label: "NASA Artemis Moon Mission", text: "NASA Artemis II Crew Announced for First Crewed Lunar Flyby Since Apollo\n\nHOUSTON — NASA officially announced the four astronauts who will fly aboard the Artemis II mission, the first crewed flight around the Moon since the Apollo 17 mission in 1972, according to a statement published on the agency's official website.\n\nThe mission is scheduled to send the crew on a roughly ten-day journey around the Moon aboard the Orion spacecraft. NASA Administrator Bill Nelson confirmed the mission represents a critical step in the agency's broader Artemis program." },
  { label: "WHO Global Health Report", text: "World Health Organization Releases Annual Global Health Statistics Report\n\nGENEVA — The World Health Organization published its annual World Health Statistics report on Wednesday, presenting comprehensive data on health trends across its 194 member states, according to the official WHO press release.\n\nThe report found that global life expectancy has continued to recover following the significant decline caused by the COVID-19 pandemic. Life expectancy at birth globally now stands at 73.3 years, according to the data." },
  { label: "Supreme Court Ruling", text: "Supreme Court Issues Unanimous Ruling on Social Media Content Moderation\n\nWASHINGTON — The Supreme Court issued a unanimous ruling on Thursday in a closely watched case examining whether states can prohibit large social media platforms from removing or restricting certain types of user content, according to the official court opinion published on the court's website.\n\nThe court vacated lower court decisions in cases brought by Florida and Texas. Justice Elena Kagan, writing for the court, said that the lower courts had not adequately analyzed whether the state laws violated the First Amendment rights of the platforms." },
];

function cn(...classes) { return classes.filter(Boolean).join(" "); }

function Toast({ msg, type = "info" }) {
  const colors = { info: "bg-slate-800 text-white", success: "bg-emerald-600 text-white", error: "bg-red-600 text-white" };
  return (
    <motion.div initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:20 }}
      className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium z-50 flex items-center gap-2", colors[type])}>
      {msg}
    </motion.div>
  );
}

function ScoreRing({ score, label }) {
  const r = 52, cx = 64, cy = 64, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const isReal = label === "REAL";
  const color = isReal ? "#10b981" : "#ef4444";
  const glow = isReal ? "drop-shadow(0 0 12px #10b98188)" : "drop-shadow(0 0 12px #ef444488)";
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg width="128" height="128" className="absolute inset-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: glow }} />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-3xl font-black" style={{ color }}>{score}%</span>
        <span className="text-xs font-semibold text-slate-400 mt-0.5">{isReal ? "CREDIBLE" : "SUSPICIOUS"}</span>
      </div>
    </div>
  );
}

function SentimentBar({ sentiment }) {
  const { score, label, detail } = sentiment;
  const pct = Math.round(((score + 1) / 2) * 100);
  const color = label === "Positive" ? "bg-emerald-500" : label === "Negative" ? "bg-red-500" : "bg-slate-500";
  const textColor = label === "Positive" ? "text-emerald-400" : label === "Negative" ? "text-red-400" : "text-slate-400";
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Emotional Tone</span>
        <span className={cn("text-xs font-bold", textColor)}>{label} ({score > 0 ? "+" : ""}{score})</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <motion.div className={cn("h-full rounded-full", color)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <div className="flex gap-3 text-xs text-slate-500">
        <span>Pos {Math.round(detail.pos*100)}%</span>
        <span>Neu {Math.round(detail.neu*100)}%</span>
        <span>Neg {Math.round(detail.neg*100)}%</span>
      </div>
    </div>
  );
}

function HighlightText({ text, keywords }) {
  if (!keywords?.length) return <span>{text}</span>;
  const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return <span>{parts.map((p, i) => keywords.some(k => k.toLowerCase() === p.toLowerCase()) ? <mark key={i} className="bg-amber-400/20 text-amber-300 rounded px-0.5 not-italic">{p}</mark> : p)}</span>;
}

function Pill({ children, color = "slate" }) {
  const map = { red: "bg-red-500/10 text-red-400 border-red-500/20", emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", amber: "bg-amber-500/10 text-amber-400 border-amber-500/20", slate: "bg-slate-700 text-slate-300 border-slate-600", indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" };
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", map[color])}>{children}</span>;
}

function Card({ children, className = "" }) {
  return <div className={cn("bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl", className)}>{children}</div>;
}

function exportPDF(result, inputText) {
  const doc = new jsPDF();
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text("TruthLens — Analysis Report", 14, 22);
  doc.setFontSize(11); doc.setTextColor(148, 163, 184);
  doc.text(`Verdict: ${result.prediction}  |  Confidence: ${result.confidence}%`, 14, 35);
  doc.text(`Real: ${result.prob_real}%   Fake: ${result.prob_fake}%`, 14, 43);
  doc.text(`Sentiment: ${result.sentiment.label} (${result.sentiment.score})`, 14, 51);
  doc.text(`Bias Keywords: ${(result.flagged_tokens||[]).join(", ")||"None"}`, 14, 59);
  if (result.reasoning) { const ls = doc.splitTextToSize(`Reasoning: ${result.reasoning}`, 180); doc.text(ls, 14, 70); }
  doc.setTextColor(255,255,255); doc.setFontSize(9);
  doc.text(doc.splitTextToSize(inputText.slice(0,800), 180), 14, 90);
  doc.save("truthlens-report.pdf");
}

export default function App() {
  const [mode, setMode] = useState("text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  const [exampleTab, setExampleTab] = useState("fake");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef(null);

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function analyze() {
    if (!input.trim()) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const endpoint = mode === "text" ? "/analyze/text" : "/analyze/url";
      const body = mode === "text" ? { text: input } : { url: input };
      const res = await fetch(`${API}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Analysis failed"); }
      const data = await res.json();
      setResult(data);
      setHistory(prev => [{ id: Date.now(), label: input.slice(0,55)+(input.length>55?"...":""), result: data, text: input }, ...prev].slice(0, MAX_HISTORY));
      showToast(data.prediction === "REAL" ? "Article appears credible" : "Suspicious content detected", data.prediction === "REAL" ? "success" : "error");
    } catch(e) { setError(e.message); showToast(e.message, "error"); }
    finally { setLoading(false); }
  }

  function loadExample(ex) {
    setMode("text"); setInput(ex.text); setResult(null); setError("");
    setShowExamples(false);
    showToast(`Loaded: ${ex.label}`);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function clearAll() { setInput(""); setResult(null); setError(""); }

  function copySummary() {
    if (!result) return;
    navigator.clipboard.writeText(`Verdict: ${result.prediction} (${result.confidence}%)\nReal: ${result.prob_real}% | Fake: ${result.prob_fake}%\nSentiment: ${result.sentiment.label}\nBias keywords: ${(result.flagged_tokens||[]).join(", ")||"None"}\nReasoning: ${result.reasoning||"N/A"}`);
    showToast("Copied to clipboard", "success");
  }

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const googleUrl = input ? `https://www.google.com/search?q=${encodeURIComponent(input.slice(0,120))}` : "#";
  const snopesUrl = input ? `https://www.snopes.com/?s=${encodeURIComponent(input.slice(0,80))}` : "#";
  const factcheckUrl = input ? `https://www.factcheck.org/?s=${encodeURIComponent(input.slice(0,80))}` : "#";
  const politifactUrl = input ? `https://www.politifact.com/search/?q=${encodeURIComponent(input.slice(0,80))}` : "#";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">

      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl" />
      </div>

      {/* Top nav */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TruthLens</span>
            <span className="hidden sm:inline text-xs text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">AI Fact Checker</span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={() => setSidebarOpen(v => !v)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
                <span className="bg-indigo-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{history.length}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex gap-6">

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Hero */}
          <div className="text-center py-6">
            <motion.h1 initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Detect Fake News
            </motion.h1>
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.15 }} className="mt-2 text-slate-400 text-sm sm:text-base">
              Paste an article or URL — AI + ML analysis in seconds
            </motion.p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50 w-fit mx-auto">
            {[["text", <Search className="w-3.5 h-3.5" />, "Paste Article"], ["url", <Link2 className="w-3.5 h-3.5" />, "Scrape URL"]].map(([m, icon, label]) => (
              <button key={m} onClick={() => { setMode(m); setInput(""); setResult(null); setError(""); }}
                className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all", mode===m ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white")}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Input card */}
          <Card className="p-5 space-y-4">
            {mode === "text" ? (
              <div className="space-y-1.5">
                <textarea ref={textareaRef} rows={7}
                  placeholder="Paste a news article here... The more text you provide, the more accurate the analysis."
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") analyze(); }}
                  className="w-full resize-none bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition leading-relaxed" />
                <div className="flex items-center justify-between px-1">
                  <span className={cn("text-xs", wordCount === 0 ? "text-slate-600" : wordCount < 50 ? "text-amber-400" : "text-emerald-400")}>
                    {wordCount > 0 ? `${wordCount} words${wordCount < 50 ? " — add more for better accuracy" : " — good length ✓"}` : "Ctrl+Enter to analyze"}
                  </span>
                  <button onClick={() => setShowExamples(v => !v)} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                    {showExamples ? "Hide examples" : "Try an example →"}
                  </button>
                </div>
              </div>
            ) : (
              <input type="url" placeholder="https://example.com/news-article"
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") analyze(); }}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition" />
            )}

            <div className="flex gap-2">
              <button onClick={analyze} disabled={loading || !input.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Analyzing...</>
                ) : (
                  <><Zap className="w-4 h-4" />Analyze</>
                )}
              </button>
              {(input || result) && (
                <button onClick={clearAll} className="px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>}
          </Card>

          {/* Examples panel */}
          <AnimatePresence>
            {showExamples && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
                <Card className="p-4 space-y-3">
                  <div className="flex gap-1 p-1 bg-slate-900/60 rounded-lg w-fit">
                    {[["fake","Fake News"],["real","Real News"]].map(([t,l]) => (
                      <button key={t} onClick={() => setExampleTab(t)}
                        className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition", exampleTab===t ? (t==="fake" ? "bg-red-600 text-white" : "bg-emerald-600 text-white") : "text-slate-400 hover:text-white")}>
                        {t==="fake" ? "🚨" : "✅"} {l}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(exampleTab==="fake" ? FAKE_EXAMPLES : REAL_EXAMPLES).map((ex, i) => (
                      <button key={i} onClick={() => loadExample(ex)}
                        className={cn("text-left p-3 rounded-xl border text-xs transition group", exampleTab==="fake" ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40" : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40")}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-200">{ex.label}</span>
                          <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition" />
                        </div>
                        <p className="text-slate-500 mt-1 line-clamp-2">{ex.text.slice(0,80)}...</p>
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading skeleton */}
          {loading && (
            <Card className="p-6">
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-32 h-32 rounded-full bg-slate-700/60" />
                <div className="h-4 w-40 bg-slate-700/60 rounded-full" />
                <div className="w-full space-y-2">
                  <div className="h-3 bg-slate-700/60 rounded-full" />
                  <div className="h-3 bg-slate-700/60 rounded-full w-4/5" />
                  <div className="h-3 bg-slate-700/60 rounded-full w-3/5" />
                </div>
              </div>
            </Card>
          )}

          {/* Result card */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div key="result" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.4 }}>
                <Card className="overflow-hidden">

                  {/* Result header */}
                  <div className={cn("px-6 py-5 border-b border-slate-700/50", result.prediction==="REAL" ? "bg-emerald-500/5" : "bg-red-500/5")}>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <ScoreRing score={result.prediction==="REAL" ? result.prob_real : result.prob_fake} label={result.prediction} />
                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className={cn("text-2xl font-black", result.prediction==="REAL" ? "text-emerald-400" : "text-red-400")}>
                            {result.prediction==="REAL" ? "✔ Likely Real" : "✘ Likely Fake"}
                          </span>
                          <Pill color={result.engine==="gemini" ? "indigo" : "slate"}>
                            {result.engine==="gemini" ? "✶ Gemini AI" : "⚙ ML Model"}
                          </Pill>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <Pill color="emerald">Real {result.prob_real}%</Pill>
                          <Pill color="red">Fake {result.prob_fake}%</Pill>
                          {result.source_status?.verified && <Pill color="emerald">✔ Verified Source</Pill>}
                          {result.source_status && !result.source_status.verified && <Pill color="amber">⚠ Unverified Source</Pill>}
                        </div>
                        {result.reasoning && (
                          <p className="text-sm text-slate-300 leading-relaxed">{result.reasoning}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">

                    {/* AI Red flags */}
                    {result.red_flags?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-400" />AI Red Flags</p>
                        <div className="flex flex-wrap gap-2">
                          {result.red_flags.map((f,i) => <Pill key={i} color="red">{f}</Pill>)}
                        </div>
                      </div>
                    )}

                    {/* Sentiment */}
                    <SentimentBar sentiment={result.sentiment} />

                    {/* Bias keywords */}
                    {result.flagged_tokens?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bias Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {result.flagged_tokens.map(kw => <Pill key={kw} color="amber">{kw}</Pill>)}
                        </div>
                      </div>
                    )}

                    {/* Article with highlights */}
                    {mode==="text" && input && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Article Preview</p>
                        <div className="bg-slate-900/60 rounded-xl p-4 max-h-44 overflow-y-auto border border-slate-700/50 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          <HighlightText text={input.slice(0,600)+(input.length>600?"...":"")} keywords={result.flagged_tokens} />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={copySummary} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition">
                        <Copy className="w-3.5 h-3.5" />Copy Summary
                      </button>
                      <button onClick={() => exportPDF(result, input)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition">
                        <Download className="w-3.5 h-3.5" />Download PDF
                      </button>
                    </div>

                    {/* Fact-check links */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verify Externally</p>
                      <div className="flex flex-wrap gap-2">
                        {[[googleUrl,"Google Search"],[snopesUrl,"Snopes"],[factcheckUrl,"FactCheck.org"],[politifactUrl,"PolitiFact"]].map(([href,label]) => (
                          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/40 text-xs transition">
                            <ExternalLink className="w-3 h-3" />{label}
                          </a>
                        ))}
                      </div>
                    </div>

                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* History sidebar */}
        <AnimatePresence>
          {sidebarOpen && history.length > 0 && (
            <motion.aside initial={{ opacity:0, x:20, width:0 }} animate={{ opacity:1, x:0, width:240 }} exit={{ opacity:0, x:20, width:0 }} className="shrink-0 hidden lg:block overflow-hidden">
              <Card className="p-4 sticky top-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />History</p>
                  <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-slate-300 transition"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-1">
                  {history.map(item => (
                    <button key={item.id} onClick={() => { setInput(item.text); setResult(item.result); setError(""); setSidebarOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-700/50 transition group space-y-0.5">
                      <p className="text-xs text-slate-400 truncate group-hover:text-slate-200 transition">{item.label}</p>
                      <p className={cn("text-xs font-bold", item.result.prediction==="REAL" ? "text-emerald-400" : "text-red-400")}>
                        {item.result.prediction} · {item.result.confidence}%
                      </p>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setHistory([]); setSidebarOpen(false); }} className="w-full text-xs text-slate-500 hover:text-red-400 transition pt-1 border-t border-slate-700">
                  Clear history
                </button>
              </Card>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>

      {/* Toast */}
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>
    </div>
  );
}
