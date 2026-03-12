/**
 * Option A: Shopping bag — clean, iconic, reads as commerce instantly.
 * Option B (OrpheusLogoCursor): Cart + cursor — automation meets commerce.
 *
 * Switch the default export or use either by name.
 */

/* ── Option A: Shopping Bag ── */
export function OrpheusLogo({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Teal rounded square */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#5EEAD4" />
      {/* Shopping bag body — filled */}
      <rect x="14" y="18" width="20" height="18" rx="3" fill="#1a1a1a" />
      {/* Bag handles */}
      <path
        d="M19 18v-3a5 5 0 0 1 10 0v3"
        stroke="#1a1a1a"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* ── Option B: Cart + Cursor ── */
export function OrpheusLogoCursor({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Teal rounded square */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#5EEAD4" />
      {/* Cart body */}
      <path
        d="M14 15h3l2.5 14h13L36 19H19"
        stroke="#1a1a1a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cart wheels */}
      <circle cx="21" cy="33" r="2" fill="#1a1a1a" />
      <circle cx="31" cy="33" r="2" fill="#1a1a1a" />
      {/* Cursor pointer — overlapping bottom-right */}
      <path
        d="M30 24l6 2.5-2.2 1.3 2 3.2-1.8 1-2-3.2-1.5 2z"
        fill="#1a1a1a"
      />
    </svg>
  );
}
