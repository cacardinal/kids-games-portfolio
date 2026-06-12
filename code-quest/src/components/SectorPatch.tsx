// NASA-style SVG sector patches (GDD §4.2). Zero image assets — circles, paths, polygons, textPath.

interface PatchProps {
  sector: 1 | 2 | 3;
  size?: number;
  earned?: boolean;
}

export function SectorPatch({ sector, size = 160, earned = true }: PatchProps) {
  const id = `patch-${sector}`;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={`sector-patch${earned ? "" : " locked"}`}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          {sector === 3 ? (
            <>
              <stop offset="0%" stopColor="#39d98a" />
              <stop offset="100%" stopColor="#22d3ee" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor={sector === 1 ? "#39d98a" : "#22d3ee"} />
              <stop offset="100%" stopColor={sector === 1 ? "#2aa86a" : "#1aa6bd"} />
            </>
          )}
        </linearGradient>
        {sector === 3 && (
          <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        <path id={`${id}-top`} d="M 40 100 A 60 60 0 0 1 160 100" fill="none" />
        <path id={`${id}-bottom`} d="M 44 100 A 56 56 0 0 0 156 100" fill="none" />
      </defs>

      {/* outer rim */}
      <circle cx="100" cy="100" r="92" fill="#0d1117" stroke={`url(#${id}-rim)`} strokeWidth="5" />
      {/* inner stroke ring */}
      <circle cx="100" cy="100" r="80" fill="#07090d" stroke={sector === 1 ? "#39d98a" : sector === 2 ? "#22d3ee" : "#39d98a"} strokeWidth="2" opacity="0.8" />
      {/* dashed stitch ring */}
      <circle cx="100" cy="100" r="74" fill="none" stroke={sector === 1 ? "#39d98a" : "#22d3ee"} strokeWidth="1.4" strokeDasharray="3 4" opacity="0.55" />

      {/* field motif per sector */}
      {sector === 1 && (
        <g>
          {/* three rising chevrons (a trajectory) */}
          <polygon points="58,128 70,116 74,120 62,132" fill="#39d98a" opacity="0.85" />
          <polygon points="80,118 92,106 96,110 84,122" fill="#39d98a" opacity="0.9" />
          <polygon points="102,108 114,96 118,100 106,112" fill="#39d98a" />
          {/* rover triangle at the tip */}
          <polygon points="124,92 132,104 116,104" fill="#39d98a" />
          {/* first-sector star */}
          <polygon points="100,40 103,49 112,49 105,55 108,64 100,58 92,64 95,55 88,49 97,49" fill="#cfeede" />
        </g>
      )}
      {sector === 2 && (
        <g>
          {/* orbit ellipse behind */}
          <ellipse cx="100" cy="104" rx="50" ry="22" fill="none" stroke="#39d98a" strokeWidth="1.5" opacity="0.4" transform="rotate(-18 100 104)" />
          {/* radial sparkle rings */}
          <circle cx="100" cy="100" r="30" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.2" />
          <circle cx="100" cy="100" r="22" fill="none" stroke="#22d3ee" strokeWidth="1.4" opacity="0.35" />
          {/* crystal */}
          <polygon points="100,76 120,100 100,124 80,100" fill="#22d3ee" opacity="0.9" />
          <line x1="100" y1="76" x2="100" y2="124" stroke="#0d1117" strokeWidth="2" opacity="0.6" />
          {/* beacon accent */}
          <circle cx="138" cy="70" r="4" fill="#22d3ee" />
          <path d="M 144 64 A 10 10 0 0 1 144 76" fill="none" stroke="#22d3ee" strokeWidth="1.4" opacity="0.7" />
        </g>
      )}
      {sector === 3 && (
        <g filter={`url(#${id}-glow)`}>
          {/* the REPEAT loop glyph */}
          <path
            d="M 78 116 A 26 26 0 1 1 122 116"
            fill="none"
            stroke={`url(#${id}-rim)`}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* arrowhead */}
          <polygon points="122,116 116,104 130,108" fill="#22d3ee" />
          {/* ×n notch */}
          <text x="100" y="106" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="20" fontWeight="700" fill="#cfeede">×n</text>
          {/* four iteration ticks */}
          {[0, 90, 180, 270].map((a) => {
            const rad = (a * Math.PI) / 180;
            const x = 100 + Math.cos(rad) * 40;
            const y = 100 + Math.sin(rad) * 40;
            return <circle key={a} cx={x} cy={y} r="2.2" fill="#39d98a" opacity="0.7" />;
          })}
        </g>
      )}

      {/* curved mottos */}
      <text className="patch-motto" fill="#d1d9e0" fontFamily="Space Grotesk, sans-serif" fontSize="15" fontWeight="700" letterSpacing="2.5">
        <textPath href={`#${id}-top`} xlinkHref={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {sector === 1 ? "MOVEMENT" : sector === 2 ? "OPERATIONS" : "LOOPS"}
        </textPath>
      </text>
      <text className="patch-motto" fill="#8a97a6" fontFamily="Space Grotesk, sans-serif" fontSize="11" fontWeight="500" letterSpacing="2">
        <textPath href={`#${id}-bottom`} xlinkHref={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          {sector === 1 ? "DRIVE TRUE" : sector === 2 ? "MAKE CONTACT" : "REPEAT THE PATTERN"}
        </textPath>
      </text>
    </svg>
  );
}
