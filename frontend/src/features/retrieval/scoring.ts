export interface ScoreView {
  primary: string;
  label: "similarity" | "distance";
  betterIsHigher: boolean;
  raw: number;
}

export function interpretScore(distance: number, metric: string): ScoreView {
  if (metric === "cosine") {
    return { primary: (1 - distance).toFixed(2), label: "similarity", betterIsHigher: true, raw: distance };
  }
  return { primary: formatDistance(distance), label: "distance", betterIsHigher: false, raw: distance };
}

function formatDistance(d: number): string {
  return Number(d.toPrecision(4)).toString();
}

export function barFractions(distances: number[], metric: string): number[] {
  if (distances.length === 0) return [];
  const goodness = distances.map((d) => (metric === "cosine" ? 1 - d : -d));
  const min = Math.min(...goodness);
  const max = Math.max(...goodness);
  if (max === min) return distances.map(() => 1);
  return goodness.map((g) => (g - min) / (max - min));
}
