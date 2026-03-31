import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const rulesSource = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");

test("firestore rules cover workspace run documents", () => {
  assert.match(rulesSource, /match \/workspaceRuns\/\{runId\}/);
});

test("workspace settings rules allow the expanded brand profile fields", () => {
  assert.match(rulesSource, /brandAudience/);
  assert.match(rulesSource, /ctaStyle/);
  assert.match(rulesSource, /bannedPhrases/);
});

test("source rules allow analysis fields used by the workspace", () => {
  assert.match(rulesSource, /sourceTypeDetail/);
  assert.match(rulesSource, /analysisSummary/);
  assert.match(rulesSource, /analysisKeyPoints/);
  assert.match(rulesSource, /analysisAudience/);
});
