import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampQuality,
  estimateOutputBytes,
  formatBytes,
  outputName,
  parseResize,
  savingsPercent,
  suggestFormat,
  summarize,
  type BatchItem,
} from "../src/core.ts";

test("formatBytes scales units", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.equal(formatBytes(3 * 1024 * 1024), "3.00 MB");
});

test("savingsPercent", () => {
  assert.equal(savingsPercent(1000, 250), 75);
  assert.equal(savingsPercent(1000, 1000), 0);
  assert.equal(savingsPercent(1000, 1500), -50);
  assert.equal(savingsPercent(0, 10), 0);
});

test("clampQuality bounds 0.05..0.95", () => {
  assert.equal(clampQuality(0), 0.05);
  assert.equal(clampQuality(0.5), 0.5);
  assert.equal(clampQuality(1), 0.95);
});

test("outputName swaps extension", () => {
  assert.equal(outputName("photo.jpg", "webp"), "photo-opt.webp");
  assert.equal(outputName("archive.png", "png"), "archive-opt.png");
  assert.equal(outputName("noext", "jpeg"), "noext-opt.jpeg");
});

test("suggestFormat keeps png, webps the rest", () => {
  assert.equal(suggestFormat("image/png"), "png");
  assert.equal(suggestFormat("image/jpeg"), "webp");
  assert.equal(suggestFormat("image/webp"), "webp");
});

test("estimateOutputBytes: lower quality = smaller estimate", () => {
  const high = estimateOutputBytes(100_000, 0.9, "webp");
  const low = estimateOutputBytes(100_000, 0.3, "webp");
  assert.ok(low < high, `${low} must be < ${high}`);
  assert.ok(estimateOutputBytes(100_000, 0.5, "webp") < estimateOutputBytes(100_000, 0.5, "png"));
});

test("parseResize: WxH, percent, width-only, invalid", () => {
  assert.deepEqual(parseResize("800x600", 100, 100), { width: 800, height: 600 });
  assert.deepEqual(parseResize("50%", 800, 600), { width: 400, height: 300 });
  assert.deepEqual(parseResize("1200", 800, 600), { width: 1200, height: 900 });
  assert.throws(() => parseResize("banana", 1, 1));
});

test("summarize aggregates completed items and lists failures", () => {
  const items: BatchItem[] = [
    { name: "a.jpg", originalBytes: 1000, outputBytes: 400, format: "webp" },
    { name: "b.jpg", originalBytes: 2000, outputBytes: 800, format: "webp" },
    { name: "c.gif", originalBytes: 500, outputBytes: null, format: "webp" },
  ];
  const summary = summarize(items);
  assert.equal(summary.count, 3);
  assert.equal(summary.totalOriginal, 3000);
  assert.equal(summary.totalOutput, 1200);
  assert.equal(summary.savedPercent, 60);
  assert.deepEqual(summary.failures, ["c.gif"]);
});
