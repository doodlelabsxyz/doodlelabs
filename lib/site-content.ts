export const processSteps = [
  {
    n: "01",
    title: "Brief",
    body: "A 30-minute call where we ask the dumb questions your last agency didn't. What you sell, who buys it, what you want to feel like online.",
    tag: "Day 1",
  },
  {
    n: "02",
    title: "Design",
    titleEm: true,
    body: "First assets delivered in 48 hours. We iterate until it's right — no limits on revision rounds, no surprise invoices for changes.",
    tag: "48 hours",
  },
  {
    n: "03",
    title: "Deliver",
    body: "Scheduled, captioned, posted. You approve once a week. Hashtags, replies, reporting — all on us. Every single month.",
    tag: "Ongoing",
  },
];

export type ServiceRow = {
  id: string;
  n: string;
  name: string;
  scope: string;
  included: string[];
  turnaround: string[];
  bestFor: string;
};

export const services: ServiceRow[] = [
  {
    id: "posts",
    n: "01",
    name: "Graphic Posts",
    scope: "Feed · Stories · Ads",
    included: ["8–12 branded posts / month", "Story templates", "Reel cover designs", "Festive & campaign sets"],
    turnaround: ["48h first draft", "Unlimited revisions", "Weekly approval cycle"],
    bestFor: "Cafés, salons, clinics, retail",
  },
  {
    id: "reels",
    n: "02",
    name: "Reels",
    scope: "Concept · Shoot · Edit",
    included: ["Concept + scripting", "On-location shoot coordination", "Editing + sound design", "Captions + hashtags"],
    turnaround: ["3–5 days per reel", "2 revision rounds"],
    bestFor: "Restaurants, retail, lifestyle brands",
  },
  {
    id: "brand",
    n: "03",
    name: "Brand Identity",
    scope: "Logo · System · Guidelines",
    included: ["Logo + icon system", "Colour palette + typography", "Brand guidelines PDF", "Social kit"],
    turnaround: ["7–10 days", "3 initial concepts", "Unlimited refinements"],
    bestFor: "New businesses & rebrands",
  },
  {
    id: "gmb",
    n: "04",
    name: "Google My Business",
    scope: "Listing · Reviews · Local SEO",
    included: ["Full listing rebuild", "Professional photo set", "Review pipeline setup", "Monthly insights report"],
    turnaround: ["Live in 48h", "Local top-3 within 6 weeks"],
    bestFor: "Any local business with a physical location",
  },
  {
    id: "strategy",
    n: "05",
    name: "Local Strategy",
    scope: "Quarterly · Pune-mapped",
    included: ["Quarterly strategy document", "Locality reach maps", "Competitor breakdown", "Pune festival calendar"],
    turnaround: ["Delivered in 7 days", "Quarterly refresh"],
    bestFor: "Businesses wanting to own their neighbourhood",
  },
];

export const faqs = [
  {
    q: "What exactly is Design as a Service?",
    a: "DaaS is a monthly subscription for design — like hiring an in-house creative, but without the salary, overheads, or onboarding time. You pay a fixed monthly fee and get a consistent volume of creative work delivered on a predictable schedule. No project-by-project invoicing, no surprise costs for revisions.",
  },
  {
    q: "How quickly will I see the first deliverable?",
    a: "Your first design is delivered within 48 hours of your brief call. Most clients are surprised — we've had first posts go live within 72 hours of signing up. The brief call itself takes about 30 minutes.",
  },
  {
    q: "What if I don't like the designs?",
    a: "Unlimited revisions, no questions asked. We iterate until you're genuinely happy. There are no revision-round limits or extra invoices for changes — it's all included in your plan. In practice, most clients approve within 1–2 rounds because we front-load the thinking in the brief.",
  },
  {
    q: "Do you only work with businesses in Pune?",
    a: "Pune-based clients are our core, but we work with any Indian business where local context matters — cafés, clinics, boutiques, salons across Maharashtra and beyond. For video production we're on-location in Pune; everything else is remote-friendly.",
  },
  {
    q: "What's the minimum commitment?",
    a: "Month-to-month. No lock-in contracts, no cancellation fees. Stay because the work is good, not because you signed something you can't get out of. That said, most clients have been with us 6+ months — consistency is where social media actually works.",
  },
  {
    q: "Can I see more work before deciding?",
    a: "Yes — the full portfolio is on the Work page, and we're happy to share examples specific to your industry on a call. Just WhatsApp us and we'll set up a 15-minute no-pressure chat.",
  },
];

export const WHATSAPP_NUMBER = "919999999999";
