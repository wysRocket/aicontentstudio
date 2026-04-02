import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workflowSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/deploy.yml"),
  "utf8",
);

const deployScriptSource = readFileSync(
  resolve(process.cwd(), ".github/scripts/deploy.mjs"),
  "utf8",
);

test("deploy workflow builds the app locally before uploading source", () => {
  assert.match(workflowSource, /npm ci/);
  assert.match(workflowSource, /npm run build/);
  assert.match(workflowSource, /Extract expected asset hashes/);
});

test("deploy script waits for production to serve the expected assets", () => {
  assert.match(deployScriptSource, /EXPECTED_CSS_ASSET/);
  assert.match(deployScriptSource, /EXPECTED_JS_ASSET/);
  assert.match(deployScriptSource, /pollForLiveAssets/);
  assert.match(deployScriptSource, /Production is serving the expected assets/);
});
