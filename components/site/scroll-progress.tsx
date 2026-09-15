"use client";

import { motion, useScroll, useSpring } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { damping: 30, stiffness: 200, restDelta: 0.001 });

  return <motion.div id="scroll-prog" style={{ scaleX, width: "100%" }} />;
}
