import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

test("app mounts scroll management so route changes do not preserve mid-page position", () => {
  assert.match(appSource, /ScrollManager/);
});
