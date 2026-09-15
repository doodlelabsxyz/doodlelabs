"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { damping: 28, stiffness: 500, mass: 0.4 });
  const springY = useSpring(y, { damping: 28, stiffness: 500, mass: 0.4 });
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    }
    function onLeaveWindow() {
      setVisible(false);
    }
    function onOver(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.(
        'a, button, [data-cursor-hover], input[type="checkbox"], .intake-check-label'
      );
      setHover(!!el);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseover", onOver);
    };
  }, [x, y]);

  return (
    <motion.div id="cursor-wrap" style={{ x: springX, y: springY }}>
      <div id="cursor-dot" className={cn(hover && "is-hover", visible && "is-visible")} />
    </motion.div>
  );
}
