// The site's own checks, run by `npm test` before the site keeper opens a pull request. Every page under public/
// (subdirectories included) needs: a doctype, a lang attribute, one non-empty <title>, one <h1>, alt text on every
// image, local links that resolve (relative to the page, or to public/ when they start with "/"), and no external
// scripts or stylesheets. No dependencies: node --test only.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const pages = readdirSync(PUBLIC, { recursive: true }).map(String).filter((f) => f.endsWith(".html")).sort();

test("the site has a home page", () => {
  assert.ok(pages.includes("index.html"));
});

for (const page of pages) {
  const html = readFileSync(join(PUBLIC, page), "utf8");

  test(`${page}: doctype, lang, one title, one h1`, () => {
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<html lang="[a-z]{2}(-[A-Z]{2})?">/);
    const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
    assert.equal(titles.length, 1, "exactly one <title>");
    assert.ok((titles[0]?.[1] ?? "").trim().length > 0, "the <title> is not empty");
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, "exactly one <h1>");
  });

  test(`${page}: every image has alt text`, () => {
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) assert.match(img, /\balt="[^"]+"/, img);
  });

  test(`${page}: local links resolve`, () => {
    for (const [, ref] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:|#)/.test(ref)) continue;
      const target = ref.split(/[?#]/)[0] ?? "";
      const file = target.startsWith("/") ? join(PUBLIC, target) : join(PUBLIC, dirname(page), target);
      assert.ok(existsSync(file), `${page} links to missing ${ref}`);
    }
  });

  test(`${page}: no external scripts or stylesheets`, () => {
    assert.doesNotMatch(html, /<script\b[^>]*\bsrc="https?:/i);
    assert.doesNotMatch(html, /<link\b[^>]*\bhref="https?:/i);
  });
}
