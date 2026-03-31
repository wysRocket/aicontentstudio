import assert from "node:assert/strict";
import test from "node:test";
import { buildUserProfilePayload } from "./firestore";

test("buildUserProfilePayload creates a full starter user document", () => {
  const payload = buildUserProfilePayload("uid-1", "person@example.com", "Person", null);

  assert.equal(payload.shouldWrite, true);
  assert.equal(payload.data.uid, "uid-1");
  assert.equal(payload.data.email, "person@example.com");
  assert.equal(payload.data.displayName, "Person");
  assert.equal(payload.data.role, "user");
  assert.equal(payload.data.credits, 1000);
});

test("buildUserProfilePayload backfills legacy user documents without changing credits", () => {
  const payload = buildUserProfilePayload(
    "uid-2",
    "owner@example.com",
    "Owner",
    "https://example.com/photo.png",
    {
      email: "owner@example.com",
      credits: 240,
    },
  );

  assert.equal(payload.shouldWrite, true);
  assert.equal(payload.data.uid, "uid-2");
  assert.equal(payload.data.role, "user");
  assert.equal(payload.data.credits, 240);
});

test("buildUserProfilePayload skips writes when the profile is already complete", () => {
  const payload = buildUserProfilePayload(
    "uid-3",
    "done@example.com",
    "Done",
    "",
    {
      uid: "uid-3",
      email: "done@example.com",
      displayName: "Done",
      photoURL: "",
      role: "user",
      credits: 80,
      createdAt: { seconds: 1, nanoseconds: 0 },
    },
  );

  assert.equal(payload.shouldWrite, false);
});
