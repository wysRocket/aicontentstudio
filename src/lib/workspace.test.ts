import assert from "node:assert/strict";
import test from "node:test";
import {
  WORKSPACE_TOOL_MODES,
  buildWorkspacePrompt,
  countWorkspaceRunsByMode,
  createWorkspaceRunDraft,
  getWorkspaceToolHref,
  normalizeWorkspaceToolMode,
} from "./workspace";

test("workspace draft defaults match the selected mode", () => {
  const draft = createWorkspaceRunDraft("summarize");

  assert.equal(draft.mode, "summarize");
  assert.equal(draft.status, "draft");
  assert.equal(draft.title, "Untitled Summary");
  assert.equal(draft.creditCost, 4);
});

test("translate prompts include the requested language and source text", () => {
  const prompt = buildWorkspacePrompt({
    mode: "translate",
    sourceText: "Ship the update this week.",
    instructions: "Keep the tone direct and professional.",
    targetLanguage: "Spanish",
  });

  assert.match(prompt, /Translate the source material into Spanish/i);
  assert.match(prompt, /Ship the update this week\./);
  assert.match(prompt, /Keep the tone direct and professional\./);
});

test("all workspace tool modes remain available for the shared workspace", () => {
  assert.deepEqual(WORKSPACE_TOOL_MODES, [
    "write_rewrite",
    "summarize",
    "transcribe",
    "translate",
    "generate_image",
    "create_document",
    "create_presentation",
  ]);
});

test("workspace sidebar counts runs per tool mode", () => {
  const counts = countWorkspaceRunsByMode([
    { mode: "write_rewrite" },
    { mode: "write_rewrite" },
    { mode: "translate" },
  ]);

  assert.deepEqual(counts, {
    write_rewrite: 2,
    summarize: 0,
    transcribe: 0,
    translate: 1,
    generate_image: 0,
    create_document: 0,
    create_presentation: 0,
  });
});

test("workspace tool query normalization falls back to write and rewrite", () => {
  assert.equal(normalizeWorkspaceToolMode("translate"), "translate");
  assert.equal(normalizeWorkspaceToolMode("unknown"), "write_rewrite");
  assert.equal(normalizeWorkspaceToolMode(null), "write_rewrite");
});

test("workspace tool href keeps tool navigation on the main dashboard route", () => {
  assert.equal(getWorkspaceToolHref("summarize"), "/dashboard?tool=summarize");
});
