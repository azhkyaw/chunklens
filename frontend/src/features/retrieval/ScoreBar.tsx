export function ScoreBar({ fraction, betterIsHigher }: { fraction: number; betterIsHigher: boolean }) {
  const pct = Math.round(fraction * 100);
  return (
    <span
      role="meter"
      aria-valuenow={pct}
      aria-label={betterIsHigher ? "relative similarity" : "relative closeness"}
      style={{ display: "inline-block", width: 80, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden", verticalAlign: "middle" }}
    >
      <span style={{ display: "block", width: `${Math.max(8, pct)}%`, height: "100%", background: "#22c55e" }} />
    </span>
  );
}
