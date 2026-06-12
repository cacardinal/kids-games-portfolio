/* eslint-disable react-refresh/only-export-components */
// Stylized single-color SVG silhouettes for landmarks (no sourced photos).
// `currentColor` fills so CSS controls ink. Each is a recognizable signature
// shape per the GDD §3.2 descriptions. A monogram-disc fallback covers any id
// without a bespoke silhouette.
import type { ReactElement, ReactNode } from "react";

type S = { title?: string };

const wrap = (title: string | undefined, children: ReactNode) => (
  <svg viewBox="0 0 100 100" role={title ? "img" : "presentation"} aria-label={title} fill="currentColor">
    {children}
  </svg>
);

const SIL: Record<string, (p: S) => ReactElement> = {
  // Statue of Liberty — torch + crown + robe
  "lm-statue-liberty": ({ title }) =>
    wrap(title, (
      <g>
        <circle cx="50" cy="22" r="6" />
        <path d="M50 24 L46 38 L54 38 Z" />
        <rect x="47" y="14" width="6" height="4" />
        <path d="M40 12 l4 4 M50 10 v6 M60 12 l-4 4" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M44 40 q6 6 12 0 l5 44 h-22 z" />
        <rect x="36" y="84" width="28" height="6" />
      </g>
    )),
  // Grand Canyon — layered mesa strata + river
  "lm-grand-canyon": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M8 40 h84 v8 h-70 v8 h60 v8 h-50 v8 h40 v8 h-30" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M30 78 q20 10 40 0" fill="none" stroke="currentColor" strokeWidth="3" />
      </g>
    )),
  // Chichén Itzá — stepped pyramid with stair
  "lm-chichen-itza": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M16 84 h68 l-10 -10 h-48 z" />
        <path d="M26 74 h48 l-9 -10 h-30 z" />
        <path d="M35 64 h30 l-8 -10 h-14 z" />
        <rect x="45" y="44" width="10" height="12" />
        <rect x="47" y="50" width="6" height="34" />
      </g>
    )),
  // Tikal — tall steep temple
  "lm-tikal": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M30 84 h40 l-6 -8 h-28 z" />
        <path d="M38 76 l12 -52 l12 52 z" />
        <rect x="46" y="30" width="8" height="10" />
      </g>
    )),
  // Machu Picchu — terraces + peak behind
  "lm-machu-picchu": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M60 84 l18 -54 l8 54 z" opacity="0.55" />
        <path d="M14 84 h44 v-8 h-30 v-8 h26 v-8 h-20 v-8 h16" fill="none" stroke="currentColor" strokeWidth="4" />
      </g>
    )),
  // Christ the Redeemer — figure with open arms
  "lm-christ-redeemer": ({ title }) =>
    wrap(title, (
      <g>
        <circle cx="50" cy="20" r="6" />
        <rect x="14" y="34" width="72" height="6" rx="3" />
        <path d="M46 30 h8 l3 50 h-14 z" />
        <rect x="40" y="80" width="20" height="6" />
      </g>
    )),
  // Angel Falls — flat-topped tepui + falling water
  "lm-angel-falls": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M20 30 h60 v10 h-60 z" />
        <path d="M34 40 v44 M44 40 v40 M54 40 v44 M64 40 v40" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.8" />
      </g>
    )),
  // Uyuni Salt Flat — horizon mirror with reflection
  "lm-salar-uyuni": ({ title }) =>
    wrap(title, (
      <g>
        <circle cx="68" cy="34" r="9" />
        <rect x="10" y="50" width="80" height="3" />
        <path d="M20 58 h60 M16 66 h68 M22 74 h56" stroke="currentColor" strokeWidth="3" opacity="0.5" />
      </g>
    )),
  // Eiffel Tower
  "lm-eiffel-tower": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M50 8 l3 18 l11 58 h-8 l-6 -34 l-6 34 h-8 l11 -58 z" />
        <path d="M40 50 h20 M37 66 h26" stroke="currentColor" strokeWidth="3" fill="none" />
        <rect x="47" y="8" width="6" height="6" />
      </g>
    )),
  // Big Ben — clock tower
  "lm-big-ben": ({ title }) =>
    wrap(title, (
      <g>
        <rect x="40" y="30" width="20" height="54" />
        <circle cx="50" cy="42" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M50 42 v-3 M50 42 h3" stroke="currentColor" strokeWidth="2" />
        <path d="M40 30 l10 -14 l10 14 z" />
        <rect x="48" y="10" width="4" height="6" />
      </g>
    )),
  // Colosseum — arched oval
  "lm-colosseum": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M18 44 a32 18 0 0 1 64 0 v30 a32 14 0 0 1 -64 0 z" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M26 40 v34 M38 36 v40 M50 35 v42 M62 36 v40 M74 40 v34" stroke="currentColor" strokeWidth="3" />
      </g>
    )),
  // Parthenon — columned temple
  "lm-parthenon": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M16 38 l34 -14 l34 14 z" />
        <rect x="18" y="38" width="64" height="6" />
        <path d="M24 44 v34 M36 44 v34 M48 44 v34 M60 44 v34 M72 44 v34" stroke="currentColor" strokeWidth="5" />
        <rect x="16" y="78" width="68" height="6" />
      </g>
    )),
  // Sagrada Família — spiky spires
  "lm-sagrada": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M30 84 l4 -50 l4 50 z" />
        <path d="M44 84 l6 -64 l6 64 z" />
        <path d="M60 84 l4 -52 l4 52 z" />
        <rect x="28" y="78" width="44" height="6" />
      </g>
    )),
  // Pyramids of Giza — three pyramids
  "lm-pyramids-giza": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M14 78 l20 -34 l20 34 z" />
        <path d="M44 78 l24 -42 l24 42 z" />
        <path d="M70 78 l14 -22 l14 22 z" opacity="0.7" />
        <rect x="10" y="78" width="84" height="6" />
      </g>
    )),
  // Kilimanjaro — broad snow peak
  "lm-kilimanjaro": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M10 80 l30 -44 l14 18 l12 -10 l24 36 z" />
        <path d="M34 44 l6 -8 l5 7 l-4 4 z" fill="#fff" opacity="0.0" />
        <rect x="8" y="80" width="84" height="5" />
      </g>
    )),
  // Table Mountain — flat-topped massif
  "lm-table-mountain": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M14 76 q4 -28 18 -30 h36 q14 2 18 30 z" />
        <rect x="10" y="76" width="80" height="6" />
      </g>
    )),
  // Great Wall — wall winding with tower
  "lm-great-wall": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M8 70 q18 -20 40 -14 t44 -6" fill="none" stroke="currentColor" strokeWidth="7" />
        <rect x="44" y="40" width="14" height="18" />
        <path d="M44 40 v-4 h3 v3 h3 v-3 h3 v3 h2 v4 z" />
      </g>
    )),
  // Taj Mahal — central dome + minarets
  "lm-taj-mahal": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M50 18 q-10 0 -10 14 q0 -22 10 -22 q10 0 10 22 q0 -14 -10 -14z" />
        <path d="M40 32 q10 14 20 0 v40 h-20 z" />
        <rect x="22" y="40" width="6" height="42" />
        <rect x="72" y="40" width="6" height="42" />
        <rect x="18" y="80" width="64" height="5" />
      </g>
    )),
  // Mount Fuji — symmetrical cone with snow cap
  "lm-mount-fuji": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M14 80 l36 -52 l36 52 z" />
        <path d="M38 45 l12 -17 l12 17 q-12 8 -24 0z" fill="#fff" opacity="0" />
        <path d="M40 42 l10 -14 l10 14 q-10 6 -20 0z" opacity="0.0" />
      </g>
    )),
  // Ha Long Bay — clustered karst humps (GDD-named)
  "lm-ha-long": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M14 80 q4 -26 12 -26 t12 26z" />
        <path d="M40 80 q6 -34 14 -34 t14 34z" />
        <path d="M66 80 q4 -22 10 -22 t10 22z" />
        <path d="M8 80 h84" stroke="currentColor" strokeWidth="3" />
      </g>
    )),
  // Grand Palace — tiered golden roof + finial
  "lm-grand-palace": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M50 12 v10" stroke="currentColor" strokeWidth="3" />
        <path d="M30 40 l20 -16 l20 16 z" />
        <path d="M26 54 l24 -18 l24 18 z" />
        <path d="M22 68 l28 -20 l28 20 z" />
        <rect x="34" y="68" width="32" height="14" />
      </g>
    )),
  // Borobudur — stepped stupa temple (Director amendment)
  "lm-borobudur": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M16 82 h68 l-6 -10 h-56 z" />
        <path d="M26 72 h48 l-5 -10 h-38 z" />
        <path d="M34 62 h32 l-4 -10 h-24 z" />
        <path d="M41 52 h18 a9 9 0 0 0 -18 0 z" />
        <circle cx="50" cy="40" r="4" />
        <rect x="48" y="30" width="4" height="6" />
      </g>
    )),
  // Sydney Opera House — sail shells
  "lm-opera-house": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M16 74 q6 -30 22 -34 q-6 18 -6 34 z" />
        <path d="M34 74 q8 -36 26 -40 q-8 22 -8 40 z" />
        <path d="M54 74 q8 -30 24 -34 q-8 18 -8 34 z" />
        <rect x="12" y="74" width="76" height="6" />
      </g>
    )),
  // Uluru — broad rounded monolith
  "lm-uluru": ({ title }) =>
    wrap(title, (
      <g>
        <path d="M14 76 q10 -28 36 -28 t36 28 z" />
        <path d="M30 60 v14 M44 54 v20 M58 56 v18 M70 62 v12" stroke="#0c1217" strokeWidth="2" opacity="0.4" />
        <rect x="10" y="76" width="80" height="6" />
      </g>
    )),
};

export function landmarkHasSilhouette(id: string): boolean {
  return id in SIL;
}

/** Monogram-disc fallback (colored ring + initials) for any landmark without art. */
function MonogramDisc({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={name} fill="currentColor">
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="3" />
      <text
        x="50"
        y="50"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="34"
        fontFamily="Fraunces, serif"
        fontWeight="600"
        fill="currentColor"
      >
        {initials}
      </text>
    </svg>
  );
}

export function LandmarkSilhouette({ id, name }: { id: string; name: string }) {
  const Art = SIL[id];
  if (Art) return Art({ title: name });
  return <MonogramDisc name={name} />;
}
