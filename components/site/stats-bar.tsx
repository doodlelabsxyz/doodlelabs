"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { Reveal } from "./reveal";

const STATS = [
  { value: 5, suffix: "+", label: "Active clients" },
  { value: 40, suffix: "+", label: "Posts delivered" },
  { value: 48, suffix: "h", label: "Avg. first delivery" },
  { value: 100, suffix: "%", label: "Client retention" },
];

function StatNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.3,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <div className="stat-n" ref={ref}>
      {display}
      <em>{suffix}</em>
    </div>
  );
}

export function StatsBar() {
  return (
    <Reveal>
      <div className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((s) => (
              <div className="stat-col" key={s.label}>
                <StatNumber value={s.value} suffix={s.suffix} />
                <div className="stat-l">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
