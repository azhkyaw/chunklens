// @ts-expect-error - "node:fs" has no ambient module declaration because
// @types/node is not a project dependency (adding it would touch
// package.json/package-lock.json, outside this task's file scope). Vitest
// runs this file through esbuild (type-stripping, no type-check), so this
// only affects `tsc -b` during `npm run build`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Parses the two token blocks out of styles.css and asserts WCAG AA contrast
// for every ink/surface pair the identity uses. This is the permanent gate:
// any future palette tweak that breaks AA fails the suite.

// NOTE: import.meta.url is assigned to a variable before use (rather than
// inlined as `new URL("../styles.css", import.meta.url)`) because Vite
// statically detects that exact literal syntax as its "asset URL" pattern
// and rewrites it to a browser asset URL - which is documented to not work
// under SSR/Node execution (Vitest runs test files through Vite's SSR
// transform). Indirecting through a variable avoids the static match while
// keeping identical runtime semantics, so this still reads the real file
// from disk.
const styleSheetUrl = import.meta.url;
const css = readFileSync(new URL("../styles.css", styleSheetUrl), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  expect(start, `selector ${selector} present in styles.css`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ["bg", "surface", "surface-2", "surface-inset", "surface-raised"];

// [foreground token, background token, minimum ratio]
const PAIRS: Array<[string, string, number]> = [
  ...SURFACES.flatMap((s): Array<[string, string, number]> => [
    ["ink", s, 4.5],
    ["ink-muted", s, 4.5],
    // faint is decorative/large-only by convention; gate at 3.0
    ["ink-faint", s, 3.0],
  ]),
  ["signal", "bg", 4.5],
  ["signal", "surface", 4.5],
  ["danger", "bg", 4.5],
  ["danger", "surface", 4.5],
  ["danger", "danger-bg", 4.5],
  ["warn-ink", "warn-bg", 4.5],
  ["accent-ink", "accent-btn", 4.5],
  // accent as a non-text indicator (rails, focus rings, LED): 3.0
  ["accent", "surface", 3.0],
];

describe.each([
  ["dark (flagship, :root default)", ":root {"],
  ["light (day shift)", ':root[data-theme="light"]'],
])("Instrument tokens: %s", (_name, selector) => {
  const t = block(selector);

  it("defines every token the pairs reference", () => {
    const needed = new Set(PAIRS.flatMap(([f, b]) => [f, b]));
    for (const name of needed) {
      expect(t[name], `--${name} in ${selector}`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it.each(PAIRS)("--%s on --%s meets %s:1", (fg, bg, min) => {
    const r = ratio(t[fg], t[bg]);
    expect(r, `--${fg} (${t[fg]}) on --${bg} (${t[bg]})`).toBeGreaterThanOrEqual(min);
  });
});
