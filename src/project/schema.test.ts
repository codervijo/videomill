import assert from "node:assert/strict";
import { test } from "node:test";
import { approvalHash, approvalState, Project } from "./schema.js";

const base = () => Project.parse({
  schema: "videomill-project-v1", slug: "t", type: "site-promo", brand: "b", source: { url: "https://example.com/" },
  formats: ["9x16"], captures: [{ id: "page", url: "https://example.com/" }],
  scenes: [{ id: "s", kind: "page-scroll", capture: "page", narration: "Hello.", caption: "Hi" }],
});

test("approval holds only while the approved content is unchanged", () => {
  const p = base();
  assert.equal(approvalState(p), "draft");
  p.approval = { status: "approved", hash: approvalHash(p) };
  assert.equal(approvalState(p), "approved");
  p.scenes[0].narration = "Hello, world.";
  assert.equal(approvalState(p), "edited since approval");
});

test("publish text is part of what gets approved; approval metadata is not", () => {
  const p = base();
  const h = approvalHash(p);
  p.approval = { status: "approved", approvedAt: "2026-10-20T00:00:00Z", hash: h };
  assert.equal(approvalHash(p), h);
  p.publish = { title: "T", description: "D", hashtags: [], channels: ["youtube"], utm: { medium: "social", campaign: "c", content: "t" } };
  assert.notEqual(approvalHash(p), h);
});
