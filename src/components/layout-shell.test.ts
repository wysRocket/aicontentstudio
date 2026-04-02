import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const layoutSource = readFileSync(
  resolve(process.cwd(), "src/components/Layout.tsx"),
  "utf8",
);

test("layout keeps the dashboard shell stretched as a column", () => {
  assert.match(
    layoutSource,
    /"flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden transition-\[margin\] duration-300"/,
  );
});

test("layout gives the outlet area the remaining viewport height", () => {
  assert.match(
    layoutSource,
    /"mx-auto flex min-h-0 w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-10"/,
  );
});

test("layout stacks the mobile header before returning to a row on larger screens", () => {
  assert.match(
    layoutSource,
    /className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"/,
  );
});
