// Mono star pips for mission rows and the title block. Earned = filled success-green; unearned =
// an un-inked outline (calm, never red).
export function StarPips({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <span className="row gap-8" aria-label={`${count} of 3 stars`} style={{ gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <Star key={i} filled={i < count} size={size} />
      ))}
    </span>
  );
}

export function Star({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 19.6l1.4-6.3L3 9l6.4-.6z"
        fill={filled ? "var(--success)" : "none"}
        stroke={filled ? "var(--success)" : "rgba(232,241,255,0.32)"}
        strokeWidth={filled ? 0 : 1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
