import type { CSSProperties } from "react";

export function ScoreBar({ fraction, betterIsHigher }: { fraction: number; betterIsHigher: boolean }) {
  const pct = Math.round(fraction * 100);
  return (
    <span
      className="scorebar"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={betterIsHigher ? "relative similarity" : "relative closeness"}
      style={{ "--frac": pct } as CSSProperties}
    >
      <span className="scorebar-fill" />
    </span>
  );
}
