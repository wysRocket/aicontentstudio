import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const dashboardSource = readFileSync(
  resolve(process.cwd(), "src/pages/Dashboard.tsx"),
  "utf8",
);

test("dashboard hero stats can wrap on narrow screens", () => {
  assert.match(
    dashboardSource,
    /className="flex flex-wrap gap-2\.5"/,
  );
});

test("dashboard tool actions stack before desktop widths", () => {
  assert.match(
    dashboardSource,
    /className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"/,
  );
  assert.match(
    dashboardSource,
    /className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end"/,
  );
});

test("dashboard text output toolbar collapses to a vertical layout on mobile", () => {
  assert.match(
    dashboardSource,
    /className="flex flex-col items-start gap-3 border-b border-white\/6 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"/,
  );
});
