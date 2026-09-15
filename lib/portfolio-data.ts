import { creativeImages, videoClips } from "./imagekit-assets.generated";

export type PostItem = {
  id: number;
  title: string;
  meta: string;
  desc: string;
  seed: number;
  /** ImageKit path for the real graphic. Falls back to a gradient placeholder when unset. */
  image?: string;
};

export type ReelItem = {
  id: number;
  title: string;
  cap: string;
  dur: string;
  meta: string;
  desc: string;
  frameSeeds: [number, number, number, number];
  stripDuration: number;
  /** ImageKit path for the cover frame shown in the rail and as the modal video's poster. */
  poster?: string;
  /** ImageKit path for the real clip, played in the work modal. */
  video?: string;
};

export type UiWorkItem = {
  id: string;
  num: string;
  name: string;
  tag: string;
  label: string;
  /** ImageKit path for the real screenshot/mock. Falls back to a gradient placeholder when unset. */
  image?: string;
};

const P_TITLES = [
  "Launch announcement",
  "Festive offer",
  "Menu highlight",
  "New collection",
  "Founder feature",
  "Quote graphic",
  "Before / after",
  "Service spotlight",
  "Testimonial post",
  "Event promo",
  "Product drop",
  "Tips carousel",
  "Did-you-know",
  "Weekend special",
  "Brand story",
  "Price list",
  "Carousel cover",
  "Promo banner",
  "Reminder post",
  "Offer spotlight",
];

const P_META = [
  "Feed post · 1080 × 1080",
  "Feed post · 1080 × 1080",
  "Carousel · 4 : 5",
  "Feed post · 1080 × 1080",
  "Carousel · 4 : 5",
  "Feed post · 1080 × 1080",
];

const P_DESC = [
  "Bold type, a single focal element and brand colour doing the heavy lifting — built to stop the scroll in a busy feed.",
  "Clear hierarchy on the offer, generous negative space, and a call-to-action that reads at thumbnail size.",
  "Dense information arranged into a clean, legible layout that still feels on-brand at a glance.",
  "Editorial composition with considered crop and contrast so the product is the hero, not the noise.",
  "A warm, human frame for the story — typographic rhythm tuned to feel premium without trying too hard.",
];

export const posts: PostItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  title: P_TITLES[i % P_TITLES.length],
  meta: P_META[i % P_META.length],
  desc: P_DESC[i % P_DESC.length],
  seed: i,
  image: creativeImages.length ? creativeImages[i % creativeImages.length] : undefined,
}));

const R_CAPS = [
  "New drop — out now ✦",
  "Behind the scenes",
  "How we made it",
  "Swipe-stopping intro",
  "Day in the studio",
  "Before vs after",
];
const R_DUR = ["0:12", "0:18", "0:09", "0:15", "0:22", "0:11"];
const R_STRIP_DURATIONS = [9.4, 10.8, 8.6, 11.2, 9.9, 10.4];

export const reels: ReelItem[] = Array.from({ length: 6 }, (_, r) => ({
  id: r,
  cap: R_CAPS[r % R_CAPS.length],
  dur: R_DUR[r % R_DUR.length],
  title: "Reel — " + R_CAPS[r % R_CAPS.length].replace(" ✦", ""),
  meta: "Reel · 9 : 16 · " + R_DUR[r % R_DUR.length],
  desc: "A short vertical edit cut for muted autoplay — kinetic captions, beat-matched transitions and a designed cover frame that earns the tap.",
  frameSeeds: [r * 3, r * 3 + 1, r * 3 + 2, r * 3 + 3],
  stripDuration: R_STRIP_DURATIONS[r % R_STRIP_DURATIONS.length],
  video: videoClips.length ? videoClips[r % videoClips.length] : undefined,
}));

export const uiWorks: UiWorkItem[] = [
  { id: "fintech", num: "UI / 01", name: "Vault", tag: "Fintech dashboard · web app", label: "Web UI · Fintech dashboard" },
  { id: "booking", num: "UI / 02", name: "Saunter", tag: "Booking flow · responsive site", label: "Web UI · Booking flow" },
  { id: "commerce", num: "UI / 03", name: "Marketplace", tag: "Storefront · commerce UI", label: "Web UI · Storefront" },
];
