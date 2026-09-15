export function ProcessDoodles() {
  return (
    <div className="doodle-layer" aria-hidden="true">
      <svg
        width="370"
        height="370"
        style={{ position: "absolute", right: -80, top: -110, overflow: "visible" }}
        viewBox="0 0 370 370"
      >
        <path
          d="M 185 18 C 258 14,352 92,350 184 C 348 276,268 350,178 348 C 88 346,14 264,18 182 C 22 100,112 22,185 18 Z"
          stroke="rgba(255,255,255,.042)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <svg
        width="330"
        height="22"
        style={{ position: "absolute", left: 66, top: 166, overflow: "visible" }}
        viewBox="0 0 330 22"
      >
        <path
          d="M 0,12 C 28,3 54,20 86,11 C 118,2 138,19 170,11 C 202,3 222,18 256,11 C 290,4 312,16 330,10"
          stroke="rgba(255,255,255,.052)"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <svg
        width="22"
        height="22"
        style={{ position: "absolute", right: "22%", bottom: 168, overflow: "visible" }}
        viewBox="0 0 22 22"
      >
        <path d="M 2,2 L 20,20 M 20,2 L 2,20" stroke="rgba(255,255,255,.065)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <svg
        width="22"
        height="22"
        style={{ position: "absolute", left: "7%", bottom: 90, overflow: "visible" }}
        viewBox="0 0 22 22"
      >
        <path d="M 2,2 L 20,20 M 20,2 L 2,20" stroke="rgba(255,255,255,.065)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <svg
        width="46"
        height="32"
        style={{ position: "absolute", right: 68, bottom: 74, overflow: "visible" }}
        viewBox="0 0 46 32"
      >
        <circle cx="6" cy="6" r="2.4" fill="rgba(255,255,255,.072)" />
        <circle cx="20" cy="12" r="2.4" fill="rgba(255,255,255,.072)" />
        <circle cx="34" cy="5" r="2.4" fill="rgba(255,255,255,.072)" />
        <circle cx="12" cy="24" r="2.4" fill="rgba(255,255,255,.072)" />
        <circle cx="28" cy="22" r="2.4" fill="rgba(255,255,255,.072)" />
      </svg>
      <svg
        width="132"
        height="132"
        style={{ position: "absolute", left: -24, bottom: 34, overflow: "visible" }}
        viewBox="0 0 132 132"
      >
        <path
          d="M 66 8 C 96 7,124 34,123 66 C 122 98,96 124,64 122 C 32 120,7 94,8 66 C 9 38,36 9,66 8 Z"
          stroke="rgba(255,255,255,.038)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="dk" style={{ fontSize: 54, right: "28%", top: 30 }}>
        ✦
      </span>
      <span className="dk" style={{ fontSize: 40, left: "3%", top: "50%", transform: "translateY(-50%)" }}>
        ×
      </span>
      <span className="dk" style={{ fontSize: 30, right: "9%", bottom: 38 }}>
        ~
      </span>
    </div>
  );
}

export function WorkDoodles() {
  return (
    <div className="workx-doodle" aria-hidden="true">
      <svg width="100" height="200" style={{ position: "absolute", left: 22, top: "14%", overflow: "visible" }} viewBox="0 0 100 200">
        <path
          d="M 72,10 C 22,12 4,44 6,100 C 8,158 26,186 72,188"
          stroke="rgba(255,255,255,.04)"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <svg width="290" height="290" style={{ position: "absolute", right: -62, bottom: -54, overflow: "visible" }} viewBox="0 0 290 290">
        <path
          d="M 145 12 C 204 10,278 74,278 145 C 278 216,214 278,145 278 C 76 278,10 216,12 145 C 14 74,86 14,145 12 Z"
          stroke="rgba(255,255,255,.036)"
          strokeWidth="1.6"
          fill="none"
        />
      </svg>
      <svg width="88" height="24" style={{ position: "absolute", right: "8%", top: "50%", overflow: "visible" }} viewBox="0 0 88 24">
        <path
          d="M 0,12 C 22,11 54,13 76,12 M 66,5 L 76,12 L 66,19"
          stroke="rgba(255,255,255,.045)"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg width="52" height="22" style={{ position: "absolute", right: "20%", top: "12%", overflow: "visible" }} viewBox="0 0 52 22">
        <circle cx="6" cy="11" r="2.2" fill="rgba(255,255,255,.06)" />
        <circle cx="24" cy="6" r="2.2" fill="rgba(255,255,255,.06)" />
        <circle cx="44" cy="14" r="2.2" fill="rgba(255,255,255,.06)" />
      </svg>
      <span className="dk" style={{ fontSize: 76, right: "44%", top: "6%" }}>
        ✦
      </span>
      <span className="dk" style={{ fontSize: 38, left: "36%", bottom: "9%" }}>
        ×
      </span>
      <span className="dk" style={{ fontSize: 26, left: "17%", top: "58%" }}>
        ~
      </span>
    </div>
  );
}

export function FooterDoodles() {
  return (
    <div className="doodle-layer" aria-hidden="true">
      <span className="dk" style={{ fontSize: 310, left: -14, bottom: -90, opacity: 0.028 }}>
        {"{"}
      </span>
      <span className="dk" style={{ fontSize: 58, left: "24%", bottom: 112 }}>
        ✦
      </span>
      <span className="dk" style={{ fontSize: 38, right: "25%", bottom: 150 }}>
        ✦
      </span>
      <span className="dk" style={{ fontSize: 30, left: "46%", top: 26 }}>
        ~
      </span>
      <svg
        width="660"
        height="20"
        style={{ position: "absolute", left: "50%", top: 20, transform: "translateX(-50%)", overflow: "visible" }}
        viewBox="0 0 660 20"
      >
        <path
          d="M 0,10 C 44,2 88,18 132,10 C 176,2 220,18 264,10 C 308,2 352,18 396,10 C 440,2 484,18 528,10 C 572,2 616,18 660,10"
          stroke="rgba(255,255,255,.042)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <svg width="210" height="210" style={{ position: "absolute", right: -46, top: -22, overflow: "visible" }} viewBox="0 0 210 210">
        <path
          d="M 105 10 C 154 9,200 54,199 105 C 198 156,154 200,105 199 C 56 198,9 154,10 105 C 11 56,56 11,105 10 Z"
          stroke="rgba(255,255,255,.038)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      <svg width="22" height="22" style={{ position: "absolute", left: "34%", top: 42, overflow: "visible" }} viewBox="0 0 22 22">
        <path d="M 2,2 L 20,20 M 20,2 L 2,20" stroke="rgba(255,255,255,.062)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <svg width="22" height="22" style={{ position: "absolute", right: "34%", bottom: 108, overflow: "visible" }} viewBox="0 0 22 22">
        <path d="M 2,2 L 20,20 M 20,2 L 2,20" stroke="rgba(255,255,255,.062)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <svg width="52" height="22" style={{ position: "absolute", left: "58%", bottom: 132, overflow: "visible" }} viewBox="0 0 52 22">
        <circle cx="8" cy="11" r="2.3" fill="rgba(255,255,255,.065)" />
        <circle cx="26" cy="7" r="2.3" fill="rgba(255,255,255,.065)" />
        <circle cx="44" cy="14" r="2.3" fill="rgba(255,255,255,.065)" />
      </svg>
    </div>
  );
}
