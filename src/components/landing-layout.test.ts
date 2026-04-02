import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const landingSource = readFileSync(
  resolve(process.cwd(), "src/pages/Landing.tsx"),
  "utf8",
);

const cssSource = readFileSync(
  resolve(process.cwd(), "src/index.css"),
  "utf8",
);

test("landing hero keeps its original single wrapping action row", () => {
  assert.match(
    landingSource,
    /className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:flex-wrap"/,
  );
});

test("landing hero art uses the original full section layer", () => {
  assert.match(cssSource, /\.landing \.hero__art\s*\{[\s\S]*?inset:\s*0;/);
  assert.match(
    cssSource,
    /\.landing \.hero__art\s*\{[\s\S]*?background-position:\s*center center;/,
  );
});

test("landing mobile hero restores the previous art alignment", () => {
  assert.match(
    cssSource,
    /@media \(max-width: 47\.99875rem\) \{[\s\S]*\.landing \.hero__art\s*\{[\s\S]*?background-position:\s*70% center;/,
  );
});
