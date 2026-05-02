import { Activity, Globe2 } from "lucide-react";
import { Logo } from "./Logo";

export const Header = () => (
  <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
    <div className="container flex h-16 items-center justify-between">
      <Logo />
      <nav className="hidden items-center gap-7 md:flex">
        {[["Lab", "lab"], ["Lenses", "lenses"], ["History", "history"], ["Method", "method"]].map(([label, href]) => (
          <a key={href} href={`#${href}`} className="mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-emerald">
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
        </span>
        <span className="mono text-[10px] uppercase text-muted-foreground">Engine Online</span>
        <Activity className="ml-1 h-3 w-3 text-emerald" />
      </div>
    </div>
  </header>
);