const TAGS = [
  "Graphic Posts",
  "Reels",
  "Web UI",
  "Carousels",
  "Branding",
  "Feed Design",
  "Content Systems",
  "Motion Edits",
  "Landing Pages",
  "Social Strategy",
];

export function Marquee() {
  const units = [...TAGS, ...TAGS];
  return (
    <div className="ticker-outer home-tick">
      <div className="ticker-inner left">
        {units.map((t, i) => (
          <span className="ticker-unit" key={i}>
            {t}
            <span className="star">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
