import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { captureSource } from "./source.js";

test("url captures open the url; file captures open the file, images in a full-width page; content changes the key", () => {
  const u = captureSource({ id: "page", url: "https://www.example.com/a" }, "/unused");
  assert.deepEqual(u, { href: "https://www.example.com/a", label: "example.com/a", key: "https://www.example.com/a" });

  const dir = mkdtempSync(join(tmpdir(), "vm-src-"));
  const html = join(dir, "storyboard.html");
  writeFileSync(html, "<h1>one</h1>");
  const file = relative(process.cwd(), html);
  const a = captureSource({ id: "sb", file }, dir);
  assert.equal(a.href, `file://${html}`);
  assert.equal(a.label, file);
  writeFileSync(html, "<h1>two</h1>");
  assert.notEqual(captureSource({ id: "sb", file }, dir).key, a.key);

  const png = join(dir, "sheet.png");
  writeFileSync(png, "not really a png");
  const img = captureSource({ id: "sheet", file: relative(process.cwd(), png) }, dir);
  assert.equal(img.href, `file://${join(dir, "sheet-src.html")}`);
  assert.match(readFileSync(join(dir, "sheet-src.html"), "utf8"), new RegExp(`<img src="file://${png}">`));
});
