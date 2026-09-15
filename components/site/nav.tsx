"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#faq", label: "Studio" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [visible, setVisible] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const sentinel = document.getElementById("hero-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -80px 0px", threshold: 0 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  const isDark = resolvedTheme ? resolvedTheme === "dark" : true;

  return (
    <nav className={cn("site-nav", visible && "is-visible")} id="nav" data-cursor-hover>
      <a href="#top" className="nav-logo">
        Doodle<span className="labs">LABS</span>
      </a>
      <div className="nav-divider" />
      <div className="nav-links">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </div>
      <a href="#contact">
        <button className="btn btn-primary">Start a project ↗</button>
      </a>
      <button
        className="theme-toggle"
        aria-label="Toggle theme"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      </button>
    </nav>
  );
}
