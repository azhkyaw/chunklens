// @ts-expect-error - "node:fs" has no ambient module declaration because
// @types/node is not a project dependency. Vitest runs this file through
// esbuild (type-stripping, no type-check), so this only affects `tsc -b`.
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// .empty-state is the base every "nothing here" surface renders through, and
// .empty-bench / .rail-empty are variants layered on top of it (both classes are
// on the same element). All three have equal specificity, so source order alone
// decides who wins - which makes two mistakes easy and invisible:
//
//   1. a variant re-declaring a property the base already sets, leaving two
//      rules fighting over one value, and
//   2. a variant declared BEFORE the base, so every override it makes is dead
//      code that silently loses.
//
// Both are guarded here.
const styleSheetUrl = import.meta.url;
const css = readFileSync(new URL("../styles.css", styleSheetUrl), "utf8");

function blockStart(selector: string): number {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, `${selector} present in styles.css`).toBeGreaterThan(-1);
  return at;
}

function declarations(selector: string): Record<string, string> {
  const open = css.indexOf("{", blockStart(selector));
  const body = css.slice(open + 1, css.indexOf("}", open));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/([a-z-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

test("the bench variant contributes only its placement", () => {
  // Everything else (layout, padding, alignment) belongs to .empty-state.
  expect(Object.keys(declarations(".empty-bench")).sort()).toEqual(["margin", "max-width"]);
});

test("the bench variant adds to the base rather than restating it", () => {
  // Scoped to .empty-bench on purpose. .rail-empty DOES restate padding, and
  // legitimately so: the rail is narrow, so it deliberately overrides the base's
  // roomier padding. That override is safe only because it is declared after the
  // base at equal specificity, which the next test is what actually guards.
  const base = declarations(".empty-state");
  const bench = Object.keys(declarations(".empty-bench")).filter((p) => p in base);
  expect(bench, ".empty-bench must not restate .empty-state").toEqual([]);
});

test("every empty-state variant is declared after the base, so its overrides win", () => {
  const base = blockStart(".empty-state");
  for (const v of [".empty-bench", ".rail-empty"]) {
    expect(blockStart(v), `${v} must come after .empty-state`).toBeGreaterThan(base);
  }
});
