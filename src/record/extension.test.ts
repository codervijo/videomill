import assert from "node:assert/strict";
import { test } from "node:test";
import { editorHtml } from "./extension.js";

test("the editor view shows the file's real text, escaped, one numbered line each", () => {
  const html = editorHtml("# Title\n\n> Source: <https://x.test/?a=1&b=2>\nplain\n");
  const lines = [...html.matchAll(/<div class="line"><span class="n">(\d+)<\/span><span class="([^"]+)">(.*?)<\/span><\/div>/g)];
  assert.deepEqual(lines.map((m) => [m[1], m[2], m[3]]), [
    ["1", "t h", "# Title"],
    ["2", "t", " "], // blank line keeps its height
    ["3", "t q", "&gt; Source: &lt;https://x.test/?a=1&amp;b=2&gt;"],
    ["4", "t", "plain"],
  ]);
});
