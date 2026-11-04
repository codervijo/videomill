import assert from "node:assert/strict";
import { test } from "node:test";
import { speakable } from "./speakable.js";

test("domains are spoken with their dots; other text is untouched", () => {
  assert.equal(speakable("Install it free at lamill.io."), "Install it free at lamill dot io.");
  assert.equal(speakable("Get a quote at lamillrentals.com."), "Get a quote at lamillrentals dot com.");
  assert.equal(speakable("See docs.lamill.io today"), "See docs dot lamill dot io today");
  assert.equal(speakable("One click. A cleaner page."), "One click. A cleaner page."); // sentence breaks aren't domains
  assert.equal(speakable("Save it as a PDF, or as a .md file."), "Save it as a PDF, or as a .md file.");
  assert.equal(speakable("It costs 2.50 today."), "It costs 2.50 today."); // numbers: TLD must be letters
});
