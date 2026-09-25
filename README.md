# image-optimizer

In-browser batch image optimizer — **files never leave your machine**.
Compression runs through `<canvas>`; the app is a single-file offline
HTML with zero npm dependencies.

```text
$ npm test          # 8 core tests (Node)
$ npm run build     # -> dist/index.html (open in any browser)
```

## Features

- **Batch queue** — drop many images at once; each is processed in
  sequence with a per-file before/after row and a download link.
- **Quality slider** — 5–95% clamped (browsers reject 0/1 quality);
  WebP/JPEG estimates shrink as quality drops (shown live in the
  summary).
- **Resize spec** — `50%` (percent), `800x600` (exact), `1200`
  (width, height auto-scaled).
- **Format suggestion** — PNG sources stay PNG (transparency/lossless),
  everything else converts to WebP for the best ratio; you can override.
- **Size comparison** — per-file and total savings percentage.

## Why canvas

`canvas.toBlob(mime, quality)` is the browser's own encoder — no wasm,
no workers, no libraries. The pure helpers (byte formatting, savings
math, resize parsing, name derivation, batch summaries) are unit-tested
in Node; the canvas glue is thin.

## Development

```console
$ npm test
$ npm run build
```

## License

MIT — see [LICENSE](LICENSE).
