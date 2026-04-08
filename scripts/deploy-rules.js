#!/usr/bin/env node
/**
 * Deploys firestore.rules to the named Firestore database.
 * The standard `firebase deploy --only firestore:rules` silently skips
 * rules for named (non-default) databases in the array firebase.json format.
 */
import { readFileSync } from "fs";
import { execSync } from "child_process";

const PROJECT_ID = "sample-firebase-ai-app-9cee4";
const DATABASE_ID = "ai-studio-659a1553-c634-4909-82e0-eccc60628d0e";
const RULES_FILE = new URL("../firestore.rules", import.meta.url).pathname;

function getAccessToken() {
  try {
    const config = JSON.parse(
      readFileSync(
        `${process.env.HOME}/.config/configstore/firebase-tools.json`,
        "utf8",
      ),
    );
    return config.tokens?.access_token;
  } catch {
    return null;
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status}: ${body.error?.message ?? JSON.stringify(body)}`,
    );
  }
  return body;
}

async function deployRules() {
  const token = getAccessToken();
  if (!token) {
    console.error("No Firebase access token found. Run: npx firebase-tools login");
    process.exit(1);
  }

  const content = readFileSync(RULES_FILE, "utf8");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  console.log("Creating ruleset...");
  const ruleset = await fetchJSON(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: { files: [{ name: "firestore.rules", content }] },
      }),
    },
  );
  const rulesetName = ruleset.name;
  console.log("Ruleset created:", rulesetName);

  console.log("Updating release for named database...");
  const releaseName = `projects/${PROJECT_ID}/releases/cloud.firestore/${DATABASE_ID}`;
  const release = await fetchJSON(
    `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ release: { name: releaseName, rulesetName } }),
    },
  );
  console.log("Release updated:", release.name);
  console.log("Now pointing to:", release.rulesetName);
  console.log("Updated at:", release.updateTime);
  console.log("\nDone! Rules deployed to named database.");
}

deployRules().catch((err) => {
  console.error("Deploy failed:", err.message);
  process.exit(1);
});
