/* Pure helpers: byte formatting, target-size estimation, output name
 * derivation and batch summaries. Canvas work lives in ui.ts. */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function savingsPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

/** Clamp quality into 0.05..0.95 (browsers reject 0/1 quality anyway). */
export function clampQuality(quality: number): number {
  return Math.min(0.95, Math.max(0.05, quality));
}

/** Derive "photo.jpg" -> "photo-opt.webp" honoring the chosen format. */
export function outputName(name: string, format: "webp" | "jpeg" | "png"): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}-opt.${format}`;
}

/** Suggest an output format: PNG when the source has transparency or is
 * already PNG (keep lossless), else WebP for the best ratio. */
export function suggestFormat(mime: string): "webp" | "jpeg" | "png" {
  if (mime === "image/png") return "png";
  return "webp";
}

/** Estimate: WebP/JPEG re-encode at quality q lands near a fraction of
 * the original; calibrated buckets rather than a fake formula. */
export function estimateOutputBytes(
  originalBytes: number,
  quality: number,
  format: "webp" | "jpeg" | "png",
): number {
  const q = clampQuality(quality);
  const fraction = format === "png" ? 0.9 : format === "jpeg" ? 0.25 + q * 0.6 : 0.2 + q * 0.5;
  return Math.max(1, Math.round(originalBytes * fraction));
}

export interface BatchItem {
  name: string;
  originalBytes: number;
  outputBytes: number | null; // null while pending
  format: "webp" | "jpeg" | "png";
}

export interface BatchSummary {
  count: number;
  totalOriginal: number;
  totalOutput: number;
  savedPercent: number;
  failures: string[];
}

export function summarize(items: BatchItem[]): BatchSummary {
  const done = items.filter((item) => item.outputBytes !== null);
  const totalOriginal = done.reduce((sum, item) => sum + item.originalBytes, 0);
  const totalOutput = done.reduce((sum, item) => sum + (item.outputBytes ?? 0), 0);
  return {
    count: items.length,
    totalOriginal,
    totalOutput,
    savedPercent: savingsPercent(totalOriginal, totalOutput),
    failures: items.filter((item) => item.outputBytes === null).map((item) => item.name),
  };
}

/** Parse "800x600", "50%", "1200" (width) resize specs. */
export function parseResize(
  spec: string,
  originalWidth: number,
  originalHeight: number,
): { width: number; height: number } {
  const text = spec.trim().toLowerCase();
  if (text === "") return { width: originalWidth, height: originalHeight };
  const percent = /^(\d+(?:\.\d+)?)%$/.exec(text);
  if (percent) {
    const factor = Number(percent[1]) / 100;
    return {
      width: Math.max(1, Math.round(originalWidth * factor)),
      height: Math.max(1, Math.round(originalHeight * factor)),
    };
  }
  const wxh = /^(\d+)\s*[x×]\s*(\d+)$/.exec(text);
  if (wxh) {
    return { width: Number(wxh[1]), height: Number(wxh[2]) };
  }
  const widthOnly = /^(\d+)$/.exec(text);
  if (widthOnly) {
    const width = Number(widthOnly[1]);
    return { width, height: Math.max(1, Math.round((width * originalHeight) / originalWidth)) };
  }
  throw new Error(`bad resize spec: "${spec}"`);
}
