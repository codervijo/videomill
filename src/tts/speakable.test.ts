import assert from "node:assert/strict";
import { test } from "node:test";
import { speakable } from "./speakable.js";

test("domains are spoken with their dots; other text is untouched", () => {
  assert.equal(speakable("Install it free at lamill.io."), "Install it free at La Mill dot I O.");
  assert.equal(speakable("Get a quote at lamillrentals.com."), "Get a quote at La Mill rentals dot com.");
  assert.equal(speakable("See docs.lamill.io today"), "See docs dot La Mill dot I O today");
  assert.equal(speakable("Try example.ai or example.org."), "Try example dot A I or example dot org.");
  assert.equal(speakable("One click. A cleaner page."), "One click. A cleaner page."); // sentence breaks aren't domains
  assert.equal(speakable("Save it as a PDF, or as a .md file."), "Save it as a PDF, or as a .md file.");
  assert.equal(speakable("It costs 2.50 today."), "It costs 2.50 today."); // numbers: TLD must be letters
});

test("LaMill is said \"La Mill\" (operator), however it's written", () => {
  assert.equal(speakable("Part of LaMill."), "Part of La Mill.");
  assert.equal(speakable("LaMill Rentals"), "La Mill Rentals");
});
