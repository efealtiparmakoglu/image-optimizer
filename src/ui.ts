/* DOM layer: file picker + drop zone, quality slider, resize spec,
 * batch queue with per-file before/after rows, download links.
 * All compression runs through <canvas> — files never leave the machine. */

import {
  clampQuality,
  formatBytes,
  outputName,
  parseResize,
  savingsPercent,
  suggestFormat,
  summarize,
  type BatchItem,
} from "./core.ts";

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

interface Job extends BatchItem {
  file: File;
  width: number;
  height: number;
}

let jobs: Job[] = [];
let quality = 0.7;
let resizeSpec = "";
let format: "webp" | "jpeg" | "png" = "webp";

function collectFiles(files: FileList | null): void {
  if (!files) return;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      jobs.push({
        name: file.name,
        originalBytes: file.size,
        outputBytes: null,
        format: suggestFormat(file.type),
        file,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      URL.revokeObjectURL(url);
      paintQueue();
    };
    img.src = url;
  }
}

function processAll(): void {
  format = ($("format") as HTMLSelectElement).value as "webp" | "jpeg" | "png";
  quality = clampQuality(Number(($("quality") as HTMLInputElement).value) / 100);
  resizeSpec = ($("resize") as HTMLInputElement).value;
  optimizeNext(0);
}

function optimizeNext(index: number): void {
  const job = jobs[index];
  if (!job) {
    paintQueue();
    ($("summary") as HTMLElement).textContent = summaryText(summarize(jobs));
    return;
  }
  const url = URL.createObjectURL(job.file);
  const img = new Image();
  img.onload = () => {
    let { width, height } = { width: img.naturalWidth, height: img.naturalHeight };
    try {
      const resized = parseResize(resizeSpec, width, height);
      width = resized.width;
      height = resized.height;
    } catch {
      /* bad spec: keep original size */
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, height);
    const mime = format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          job.outputBytes = null;
        } else {
          job.outputBytes = blob.size;
          job.file = new File([blob], outputName(job.name, format), { type: mime });
        }
        paintQueue();
        optimizeNext(index + 1);
      },
      mime,
      quality,
    );
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function summaryText(summary: ReturnType<typeof summarize>): string {
  return (
    `${summary.count} file(s): ${formatBytes(summary.totalOriginal)} -> ` +
    `${formatBytes(summary.totalOutput)} (saved ${summary.savedPercent}%)` +
    (summary.failures.length ? ` — failed: ${summary.failures.join(", ")}` : "")
  );
}

function paintQueue(): void {
  const queueEl = $("queue");
  queueEl.innerHTML = "";
  for (const job of jobs) {
    const row = document.createElement("div");
    row.className = "job";
    const after = job.outputBytes === null ? "…" : formatBytes(job.outputBytes);
    const percent =
      job.outputBytes === null ? "" : ` (${savingsPercent(job.originalBytes, job.outputBytes)}%)`;
    row.innerHTML = `<strong></strong><span></span>`;
    (row.querySelector("strong") as HTMLElement).textContent = job.name;
    (row.querySelector("span") as HTMLElement).textContent =
      `${formatBytes(job.originalBytes)} -> ${after}${percent}`;
    if (job.outputBytes !== null) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(job.file);
      link.download = outputName(job.name, format);
      link.textContent = "download";
      row.appendChild(link);
    }
    queueEl.appendChild(row);
  }
  $("summary").textContent = summaryText(summarize(jobs));
}

function setup(): void {
  const drop = $("drop");
  drop.addEventListener("dragover", (event) => event.preventDefault());
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    collectFiles((event as DragEvent).dataTransfer?.files ?? null);
  });
  drop.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.addEventListener("change", () => collectFiles(input.files));
    input.click();
  });
  $("quality")?.addEventListener("input", (event) => {
    $("quality-value").textContent = `${(event.target as HTMLInputElement).value}%`;
  });
  $("optimize")?.addEventListener("click", processAll);
  $("clear")?.addEventListener("click", () => {
    jobs = [];
    paintQueue();
  });
}

setup();
