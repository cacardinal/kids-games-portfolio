// Detective ID card cosmetic (GDD §6.2 + director amendment: 6 styles, one per rank).
// All CSS/SVG, no images. The 6th (obsidian "Inspector's Ink") follows the design
// language: obsidian/ink card with brass pinstripe.

import type { CardStyleId } from "../game/progression";

export function IdCard({
  styleId,
  name,
  rankName,
  initial,
  discColor,
}: {
  styleId: CardStyleId;
  name: string;
  rankName: string;
  initial: string;
  discColor: string;
}) {
  return (
    <div className={`idcard idcard--${styleId}`}>
      <div className="idcard__pin idcard__pin--l" aria-hidden />
      <div className="idcard__pin idcard__pin--r" aria-hidden />
      <div className="idcard__inner grain">
        <div className="idcard__top">
          <span className="idcard__disc" style={{ background: discColor }}>
            <span className="display">{initial}</span>
          </span>
          <div className="idcard__id">
            <div className="idcard__label display">Detective Academy</div>
            <div className="idcard__name display">{name}</div>
          </div>
        </div>
        <div className="idcard__rank">
          <span className="idcard__rank-label meta">Rank</span>
          <span className="idcard__rank-name display">{rankName}</span>
        </div>
        <div className="idcard__watermark display" aria-hidden>
          CONFIDENTIAL
        </div>
        {/* style-specific embellishments */}
        {styleId === "lamplight" && <div className="idcard__lamp" aria-hidden />}
        {styleId === "brass_ink" && <div className="idcard__seal" aria-hidden />}
        {styleId === "obsidian" && <div className="idcard__pinstripe" aria-hidden />}
        {styleId === "chiefs_seal" && (
          <svg className="idcard__laurel" viewBox="0 0 120 120" aria-hidden>
            <g
              fill="none"
              stroke="var(--brass)"
              strokeWidth="1.4"
              opacity="0.85"
            >
              <path d="M60 18 C40 30 34 55 42 90" />
              <path d="M60 18 C80 30 86 55 78 90" />
              {Array.from({ length: 6 }).map((_, i) => (
                <ellipse key={`l${i}`} cx={44 - i} cy={40 + i * 8} rx="5" ry="2.4" transform={`rotate(${-40} ${44 - i} ${40 + i * 8})`} />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <ellipse key={`r${i}`} cx={76 + i} cy={40 + i * 8} rx="5" ry="2.4" transform={`rotate(${40} ${76 + i} ${40 + i * 8})`} />
              ))}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
