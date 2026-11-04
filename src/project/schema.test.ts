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

test("a capture may record an extension's popup and outputs (v1.J); bad yields are rejected", () => {
  const ext = { name: "save-page-pdf-md", outputs: [{ id: "markdown", click: "Save as Markdown", yields: "download" }, { id: "pdf", click: "Save as PDF", yields: "page" }] };
  const p = Project.parse({ ...base(), captures: [{ id: "page", url: "https://example.com/", extension: ext }] });
  assert.deepEqual(p.captures[0].extension, ext);
  assert.notEqual(approvalHash(p), approvalHash(base())); // what gets recorded is approved
  const bad = Project.safeParse({ ...base(), captures: [{ id: "page", url: "https://example.com/", extension: { ...ext, outputs: [{ id: "x", click: "Go", yields: "file" }] } }] });
  assert.equal(bad.success, false);
});

test("v1.J scenes: `view` and popup shots need the capture's extension; title/badges cards parse", () => {
  const ext = { name: "e", outputs: [{ id: "markdown", click: "Save as Markdown", yields: "download" }] };
  const page = { id: "s", kind: "page-scroll", capture: "page", narration: "", caption: "" };
  const withExt = (scenes: object[]) => Project.safeParse({ ...base(), captures: [{ id: "page", url: "https://example.com/", extension: ext }], scenes });
  assert.equal(withExt([{ ...page, view: "markdown", frame: "editor", narration: "x", caption: "x" }]).success, true);
  assert.equal(withExt([{ ...page, view: "pdf", narration: "x", caption: "x" }]).success, false); // no such output
  assert.equal(withExt([{ ...page, shots: [{ kind: "popup", state: "markdown", say: "Saved." }] }]).success, true);
  assert.equal(withExt([{ ...page, shots: [{ kind: "popup", state: "nope", say: "x" }] }]).success, false);
  const noExt = Project.safeParse({ ...base(), scenes: [{ ...page, shots: [{ kind: "popup", say: "x" }] }] });
  assert.equal(noExt.success, false); // popup without an extension
  const cards = withExt([
    { id: "t", kind: "title", text: "Save any page.", narration: "Save any page.", caption: "" },
    { id: "b", kind: "badges", items: [{ icon: "shield", label: "Runs locally" }], narration: "Runs locally.", caption: "" },
  ]);
  assert.equal(cards.success, true);
  assert.equal(withExt([{ id: "b", kind: "badges", items: [{ icon: "rocket", label: "x" }], narration: "", caption: "" }]).success, false);
});

test("a project's own end card (v1.K) is approved content", () => {
  const end = { headline: "Install free", url: "lamill.io", tagline: "Useful tools for real work" };
  const p = Project.parse({ ...base(), endCard: end });
  assert.deepEqual(p.endCard, { ...end, seconds: 2 });
  assert.notEqual(approvalHash(p), approvalHash(base()));
});
