"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useMotionValue, useSpring } from "motion/react";
import { buildSrc } from "@imagekit/next";
import { swatchStyle } from "./placeholder-art";
import { creativeImages } from "@/lib/imagekit-assets.generated";

gsap.registerPlugin(ScrollTrigger);

// logical (unscaled) size of the grid + wordmark mask — scaled up to fill the
// viewport at rest, then scaled down to 1 as the user scrolls through.
const GRID_W = 1200;
const GRID_H = 420;
const TILE = 40;
const GRID_COLS = Math.floor(GRID_W / TILE);
const GRID_ROWS = Math.floor(GRID_H / TILE);
const S_MAX = 3;

const TILE_META = [
  "Graphic post — Skin Clinic",
  "Graphic post — Social feed",
  "Campaign — Offer post",
  "Reel cover — Web3 · Launch",
  "Social strategy — Content system",
  "Graphic post — Referral program",
  "Landing page — Waitlist",
  "Campaign — Launch",
  "Carousel — Thread design",
  "Graphic post — Restaurant",
  "Feed design — Grid layout",
  "Reel — Instagram",
];

// deterministic pseudo-random hash (0..1) — keeps SSR and client render identical
function hash(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

// small square crop sized for a mosaic tile at up to ~2x device pixel ratio
function tileImageUrl(src: string) {
  return buildSrc({
    urlEndpoint: IK_ENDPOINT,
    src,
    transformation: [{ width: 120, height: 120, crop: "at_max", quality: 60, format: "auto" }],
  });
}

type Tile = {
  x: number;
  y: number;
  seed: number;
  meta: string;
  image?: string;
  bFrom: string;
  bTo: string;
  duration: string;
  delay: string;
};

function buildGrid(): Tile[] {
  const tiles: Tile[] = [];
  let i = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const seed = i;
      tiles.push({
        x: col * TILE,
        y: row * TILE,
        seed,
        meta: TILE_META[i % TILE_META.length],
        image: creativeImages.length ? tileImageUrl(creativeImages[i % creativeImages.length]) : undefined,
        bFrom: (0.55 + hash(seed) * 0.45).toFixed(2),
        bTo: (0.25 + hash(seed + 137) * 0.35).toFixed(2),
        duration: (2.2 + hash(seed + 271) * 3.8).toFixed(1),
        delay: (hash(seed + 409) * 4).toFixed(1),
      });
      i++;
    }
  }
  return tiles;
}

const GRID_TILES = buildGrid();

const TAGLINE = "Design as a Service";

export function Hero() {
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<SVGSVGElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [cursorDone, setCursorDone] = useState(false);
  const typedStarted = useRef(false);
  const maskId = useId();

  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const px = useSpring(targetX, { damping: 22, stiffness: 55, mass: 1 });
  const py = useSpring(targetY, { damping: 22, stiffness: 55, mass: 1 });

  const runTypewriter = useCallback(() => {
    let i = 0;
    const tick = () => {
      setTyped(TAGLINE.slice(0, i));
      if (i <= TAGLINE.length) {
        i++;
        setTimeout(tick, 68);
      } else {
        setTimeout(() => setCursorDone(true), 2200);
      }
    };
    tick();
  }, []);

  // scroll-scrubbed zoom-out: full grid → wordmark reveal, + tagline fade + typewriter trigger
  // useLayoutEffect (not useEffect) so the initial transform is applied before
  // the browser's first paint — otherwise there's a visible flash from the
  // CSS-default full-screen state to whatever the real scroll position is.
  useLayoutEffect(() => {
    if (!outerRef.current || !stageRef.current || !taglineRef.current) return;

    function applyProgress(p: number) {
      const ep = 1 - Math.pow(1 - p, 2.4);
      if (stageRef.current) {
        stageRef.current.style.transform = `scale(${S_MAX + (1 - S_MAX) * ep})`;
      }
      if (maskRef.current) {
        maskRef.current.style.opacity = String(Math.min(1, ep / 0.85));
      }
      if (taglineRef.current) {
        taglineRef.current.style.opacity = String(Math.max(0, (p - 0.78) / 0.22));
      }
      if (p > 0.6 && !typedStarted.current) {
        typedStarted.current = true;
        runTypewriter();
      }
    }

    const st = ScrollTrigger.create({
      trigger: outerRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => applyProgress(self.progress),
    });
    // sync the initial visual state immediately — onUpdate only fires on the
    // next scroll event, so without this the stage sits unscaled until then.
    applyProgress(st.progress);

    return () => st.kill();
  }, [runTypewriter]);

  // gentle mouse parallax on the tile field
  useEffect(() => {
    function onMove(e: MouseEvent) {
      targetX.set((e.clientX / window.innerWidth - 0.5) * 28);
      targetY.set((e.clientY / window.innerHeight - 0.5) * 14);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [targetX, targetY]);

  const stageStyle = useMemo(() => ({ width: GRID_W, height: GRID_H }), []);

  return (
    <div className="hero-outer" id="hero-outer" ref={outerRef}>
      <div className="hero-sticky" id="hero-sticky">
        <motion.div id="mosaic-parallax" style={{ x: px, y: py }}>
          <div id="mosaic-stage" ref={stageRef} style={stageStyle}>
            {GRID_TILES.map((t) => (
              <div
                key={t.seed}
                className="m-tile"
                style={{
                  left: t.x,
                  top: t.y,
                  width: TILE,
                  height: TILE,
                  ...(t.image ? { backgroundImage: `url(${t.image})` } : swatchStyle(t.seed)),
                  animation: `tile-ambient ${t.duration}s ${t.delay}s ease-in-out infinite alternate`,
                  ["--b-from" as string]: t.bFrom,
                  ["--b-to" as string]: t.bTo,
                }}
                onMouseEnter={() => setReveal(t.meta)}
                onMouseLeave={() => setReveal(null)}
              />
            ))}

            {/* wordmark mask — a punched-out "Doodle LABS" stencil that fades in
               over the grid as the user scrolls, so the grid resolves into the
               logo instead of the tiles ever being arranged as letters. */}
            <svg
              ref={maskRef}
              className="mosaic-mask"
              viewBox={`0 0 ${GRID_W} ${GRID_H}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <defs>
                <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={GRID_W} height={GRID_H}>
                  <rect width={GRID_W} height={GRID_H} fill="#fff" />
                  <text
                    x={GRID_W / 2}
                    y={GRID_H / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    textLength={GRID_W * 0.8}
                    lengthAdjust="spacingAndGlyphs"
                    fontSize={GRID_H * 0.46}
                    fontFamily="var(--font-display)"
                    fontStyle="italic"
                    fontWeight={700}
                    fill="#000"
                  >
                    Doodle LABS
                  </text>
                </mask>
              </defs>
              <rect width={GRID_W} height={GRID_H} fill="#000" mask={`url(#${maskId})`} />
            </svg>
          </div>
        </motion.div>

        <div id="tile-reveal" style={{ opacity: reveal ? 1 : 0 }}>
          {reveal}
        </div>

        <div id="hero-tagline" ref={taglineRef}>
          <span className="tl-main">
            <span id="typed-text">{typed}</span>
            {!cursorDone && <span className="tl-cursor" />}
          </span>
          <span className="tl-hint">↓ scroll</span>
        </div>

        <div id="hero-context">
          <span className="hc-pill">Design as a Service</span>
          <span className="hc-sep" />
          <span className="hc-pill">Social content for local businesses</span>
          <span className="hc-sep" />
          <span className="hc-pill">48h first delivery</span>
          <span className="hc-sep" />
          <span className="hc-pill">Pune, India · Est. 2022</span>
          <a href="#contact" style={{ marginLeft: "auto" }}>
            <button className="btn btn-ghost-w" style={{ padding: "10px 20px", fontSize: 9, letterSpacing: ".16em" }}>
              Start a project ↗
            </button>
          </a>
        </div>
      </div>

      <div id="hero-sentinel" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1 }} />
    </div>
  );
}
