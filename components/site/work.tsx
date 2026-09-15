"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Dialog } from "@base-ui/react/dialog";
import { Video as IKVideo } from "@imagekit/next";
import { ArrowLeft, ArrowRight, ImageIcon, LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceholderArt } from "./placeholder-art";
import { WorkDoodles } from "./doodles";
import { posts, reels, uiWorks, type PostItem, type ReelItem } from "@/lib/portfolio-data";

gsap.registerPlugin(ScrollTrigger);

const ZONES: ReactNode[] = [
  <>
    Graphic <em>posts.</em>
  </>,
  <em key="reels">Reels.</em>,
  <>
    Web <em>UI.</em>
  </>,
];

const ROW_SPEED = [-26, 34, -46];
const POST_ROWS = [posts.slice(0, 7), posts.slice(7, 14), posts.slice(14, 20)];

type WorkMedia = { kind: "post"; data: PostItem } | { kind: "reel"; data: ReelItem };

function ReelCard({
  reel,
  className,
  onClick,
}: {
  reel: ReelItem;
  className?: string;
  onClick?: () => void;
}) {
  const frames = [...reel.frameSeeds, ...reel.frameSeeds];
  return (
    <div className={cn("reel", className)} onClick={onClick} data-cursor-hover>
      {reel.poster ? (
        <PlaceholderArt seed={reel.frameSeeds[0]} src={reel.poster} alt={reel.title} className="absolute inset-0" />
      ) : (
        <div className="reel-strip" style={{ animationDuration: `${reel.stripDuration}s` }}>
          {frames.map((seed, i) => (
            <PlaceholderArt key={i} seed={seed} />
          ))}
        </div>
      )}
      <div className="reel-ui">
        <div className="reel-top">
          <span className="reel-live">
            <span className="dot" />
            LIVE
          </span>
          <span className="reel-dur">{reel.dur}</span>
        </div>
        <div className="reel-bot">
          <div className="reel-cap">{reel.cap}</div>
          <div className="reel-music">♪ Original audio</div>
        </div>
      </div>
      <div className="reel-prog">
        <i style={{ animationDuration: `${reel.stripDuration}s` }} />
      </div>
      <div className="reel-open">
        <span>Open ↗</span>
      </div>
    </div>
  );
}

function WorkModal({
  media,
  onClose,
  onStep,
  index,
  total,
}: {
  media: WorkMedia | null;
  onClose: () => void;
  onStep: (n: number) => void;
  index: number;
  total: number;
}) {
  const open = !!media;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") onStep(-1);
      else if (e.key === "ArrowRight") onStep(1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onStep]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="wx-scrim" />
        <Dialog.Popup className="wx-popup">
          <Dialog.Close className="wx-close" aria-label="Close">
            <X className="size-4" />
          </Dialog.Close>
          {media?.kind === "reel" ? (
            <div className="wx-media">
              {media.data.video ? (
                <IKVideo
                  src={media.data.video}
                  poster={media.data.poster}
                  transformation={[{ original: true }]}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-[70vh] max-h-[86vh] w-auto max-w-full rounded-[28px]"
                />
              ) : (
                <ReelCard reel={media.data} />
              )}
            </div>
          ) : media?.kind === "post" ? (
            <div className="wx-media">
              <PlaceholderArt
                seed={media.data.seed}
                icon={ImageIcon}
                src={media.data.image}
                alt={media.data.title}
                className="h-[70vh] max-h-[86vh] w-[46vw] max-w-full"
              />
            </div>
          ) : (
            <div className="wx-media" />
          )}
          <div className="wx-info">
            <span className="wx-fmt">
              {media?.kind === "reel" ? "Reel · Always-on social video" : "Graphic post · Social feed"}
            </span>
            <h3 className="wx-title">{media?.data.title}</h3>
            <p className="wx-desc">{media?.data.desc}</p>
            <div className="wx-specs">
              {media?.kind === "reel" ? (
                <>
                  <div className="wx-spec">
                    <span>Format</span>
                    <span>Reel · vertical video</span>
                  </div>
                  <div className="wx-spec">
                    <span>Ratio</span>
                    <span>9 : 16 · 1080×1920</span>
                  </div>
                  <div className="wx-spec">
                    <span>Length</span>
                    <span>{media.data.dur}</span>
                  </div>
                  <div className="wx-spec">
                    <span>Turnaround</span>
                    <span>48–72 hrs</span>
                  </div>
                </>
              ) : media?.kind === "post" ? (
                <>
                  <div className="wx-spec">
                    <span>Format</span>
                    <span>{media.data.meta.split(" · ")[0]}</span>
                  </div>
                  <div className="wx-spec">
                    <span>Ratio</span>
                    <span>{media.data.meta.split(" · ")[1] || "1 : 1"}</span>
                  </div>
                  <div className="wx-spec">
                    <span>Tool</span>
                    <span>Figma · Illustrator</span>
                  </div>
                  <div className="wx-spec">
                    <span>Turnaround</span>
                    <span>48 hrs</span>
                  </div>
                </>
              ) : null}
            </div>
            <div className="wx-foot">
              <span className="wx-counter">
                {index + 1} / {total}
              </span>
              <div className="wx-arrows">
                <button className="wx-nav-btn" aria-label="Previous" onClick={() => onStep(-1)} data-cursor-hover>
                  <ArrowLeft className="size-4" />
                </button>
                <button className="wx-nav-btn" aria-label="Next" onClick={() => onStep(1)} data-cursor-hover>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Work() {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const watermarkRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hintRef = useRef<HTMLDivElement>(null);

  const [zone, setZone] = useState(0);
  const [modalList, setModalList] = useState<"posts" | "reels" | null>(null);
  const [modalIdx, setModalIdx] = useState(0);

  useLayoutEffect(() => {
    if (!outerRef.current || !trackRef.current) return;

    function applyProgress(p: number) {
      const track = trackRef.current;
      if (!track) return;
      const travel = Math.max(0, track.scrollWidth - window.innerWidth);
      const x = -p * travel;
      track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;

      rowRefs.current.forEach((row, i) => {
        if (!row) return;
        const off = (p * 2 - 1) * ROW_SPEED[i];
        row.style.transform = `translate3d(${off.toFixed(1)}px,0,0)`;
      });

      watermarkRefs.current.forEach((w) => {
        if (!w) return;
        const wx = (0.5 - p) * 260 * 0.5;
        w.style.transform = `translateY(-50%) translateX(${wx.toFixed(1)}px)`;
      });

      const centreVp = window.innerWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      const panels = track.children;
      for (let i = 0; i < panels.length; i++) {
        const el = panels[i] as HTMLElement;
        const pc = el.offsetLeft + el.offsetWidth / 2 + x;
        const d = Math.abs(pc - centreVp);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setZone((prev) => (prev === best ? prev : best));

      if (hintRef.current) {
        hintRef.current.style.opacity = p > 0.03 && p < 0.97 ? "0.34" : p >= 0.97 ? "0" : "0.34";
        if (p > 0.06) hintRef.current.style.opacity = "0";
      }
    }

    const st = ScrollTrigger.create({
      trigger: outerRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => applyProgress(self.progress),
    });
    // sync initial state immediately — onUpdate only fires on the next scroll event
    applyProgress(st.progress);

    return () => st.kill();
  }, []);

  function openModal(list: "posts" | "reels", idx: number) {
    setModalList(list);
    setModalIdx(idx);
  }
  function closeModal() {
    setModalList(null);
  }
  function step(n: number) {
    const total = modalList === "posts" ? posts.length : reels.length;
    setModalIdx((i) => (i + n + total) % total);
  }

  const media: WorkMedia | null =
    modalList === "posts"
      ? { kind: "post", data: posts[modalIdx] }
      : modalList === "reels"
        ? { kind: "reel", data: reels[modalIdx] }
        : null;

  return (
    <section className="workx-outer" id="work" ref={outerRef}>
      <div className="workx-sticky">
        <WorkDoodles />

        <div className="workx-hud">
          <div className="workx-hud-left">
            <span className="workx-eyebrow">Selected work — the deliverables</span>
            <div className="workx-zone">{ZONES[zone]}</div>
          </div>
          <div className="workx-hud-right">
            <div className="workx-steps">
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn("workx-step", i <= zone && "is-on")} />
              ))}
            </div>
            <span className="workx-count">0{zone + 1} / 03</span>
          </div>
        </div>

        <div className="workx-hint" ref={hintRef}>
          <span>Scroll to move through the work</span>
          <span className="wx-arrow">→</span>
        </div>

        <div className="workx-track" ref={trackRef}>
          {/* PANEL 1 — POSTS */}
          <div className="workx-panel">
            <div className="workx-watermark" ref={(el) => { watermarkRefs.current[0] = el; }}>
              POSTS
            </div>
            <div className="posts-wall">
              {POST_ROWS.map((rowPosts, ri) => {
                return (
                  <div
                    key={ri}
                    className={cn("posts-row", ri === 1 && "r2", ri === 2 && "r3")}
                    ref={(el) => { rowRefs.current[ri] = el; }}
                  >
                    {rowPosts.map((post) => (
                      <div
                        key={post.id}
                        className="post-tile"
                        onClick={() => openModal("posts", post.id)}
                        data-cursor-hover
                      >
                        <PlaceholderArt seed={post.seed} icon={ImageIcon} src={post.image} alt={post.title} />
                        <div className="pt-over">
                          <div className="pt-title">{post.title}</div>
                          <div className="pt-meta">{post.meta}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PANEL 2 — REELS */}
          <div className="workx-panel">
            <div className="workx-watermark" ref={(el) => { watermarkRefs.current[1] = el; }}>
              REELS
            </div>
            <div className="reels-rail">
              {reels.map((reel, ri) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  className={ri % 2 === 0 ? "up" : "down"}
                  onClick={() => openModal("reels", reel.id)}
                />
              ))}
            </div>
          </div>

          {/* PANEL 3 — UI */}
          <div className="workx-panel">
            <div className="workx-watermark" ref={(el) => { watermarkRefs.current[2] = el; }}>
              UI/UX
            </div>
            <div className="ui-wall">
              {uiWorks.map((w) => (
                <a key={w.id} className="ui-card" href={`#work`} data-cursor-hover>
                  <div className="ui-shot">
                    <PlaceholderArt
                      seed={w.id.length + w.num.length}
                      icon={LayoutGrid}
                      label={w.label}
                      src={w.image}
                      alt={w.name}
                      className="absolute inset-0"
                    />
                    <div className="ui-shot-over" />
                  </div>
                  <div className="ui-meta">
                    <div className="ui-meta-l">
                      <span className="ui-num">{w.num}</span>
                      <span className="ui-name">{w.name}</span>
                      <span className="ui-tag">{w.tag}</span>
                    </div>
                    <span className="ui-open">Case study ↗</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <WorkModal media={media} onClose={closeModal} onStep={step} index={modalIdx} total={modalList === "posts" ? posts.length : reels.length} />
    </section>
  );
}
