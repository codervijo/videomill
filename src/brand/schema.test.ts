import assert from "node:assert/strict";
import { test } from "node:test";
import { cardBrand } from "./cards.js";
import { isDark, loadBrand } from "./schema.js";

test("committed brands load, with every asset present", () => {
  const r = loadBrand("lamillrentals");
  assert.equal(r.parent?.brand, "lamill");
  assert.equal(loadBrand(r.parent!.brand).name, "LaMill");
});

test("card logo variant follows the background", () => {
  const lamill = loadBrand("lamill");
  assert.ok(isDark("#07090B") && !isDark("#FFFFFF"));
  assert.equal(cardBrand(lamill).logo, "brand/lamill/logo-dark.svg"); // own dark background
  assert.equal(cardBrand(lamill, "#FFFFFF").logo, "brand/lamill/logo.svg"); // sign-off on a white end-card
});
