import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../env";

const run = promisify(execFile);

type Item = { str: string; x: number; y: number; width: number; height: number; fontSize: number };

/**
 * Rebuild visual lines from positioned PDF text items. Columns are separated
 * by two or more spaces, which keeps "Test  Value  Unit  Range" rows intact.
 */
export function itemsToLines(items: Item[]): string[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Item[][] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    const tol = Math.max(2, (it.fontSize || it.height || 10) * 0.45);
    if (row && Math.abs(row[0].y - it.y) <= tol) row.push(it);
    else rows.push([it]);
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let line = "";
    let end = -Infinity;
    for (const it of row) {
      const fs = it.fontSize || it.height || 10;
      const gap = it.x - end;
      if (line) line += gap > fs * 1.2 ? "    " : gap > fs * 0.12 ? " " : "";
      line += it.str;
      end = it.x + (it.width || it.str.length * fs * 0.5);
    }
    return line.replace(/\s+$/, "");
  });
}

export async function extractPdfText(data: Buffer, maxPages = 30): Promise<{ text: string; pages: number }> {
  const { getDocumentProxy, extractTextItems } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(data));
  try {
    const { totalPages, items } = await extractTextItems(pdf);
    const pages = items.slice(0, maxPages).map((pageItems) => itemsToLines(pageItems).join("\n"));
    return { text: pages.join("\n\n"), pages: totalPages };
  } finally {
    await pdf.cleanup().catch(() => undefined);
  }
}

/** A text layer with very little content means the PDF is a scan/photo. */
export function looksScanned(text: string, pages: number): boolean {
  const alnum = (text.match(/[a-z0-9]/gi) ?? []).length;
  return alnum < Math.max(80, 40 * Math.max(1, pages));
}

let tesseractAvailable: Promise<boolean> | null = null;
export function ocrAvailable(): Promise<boolean> {
  if (!env().OCR_ENABLED) return Promise.resolve(false);
  tesseractAvailable ??= run("tesseract", ["--version"], { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  return tesseractAvailable;
}

async function tesseract(imagePath: string): Promise<string> {
  const langs = env().TESSERACT_LANGS.replace(/[^a-z_+]/gi, "") || "eng";
  const { stdout } = await run(
    "tesseract",
    [imagePath, "stdout", "-l", langs, "--psm", "6", "-c", "preserve_interword_spaces=1"],
    { timeout: 120_000, maxBuffer: 20 * 1024 * 1024 },
  );
  return stdout;
}

/**
 * Local OCR (Tesseract) so scanned reports never have to leave the server as
 * images. Scanned PDFs are rasterised with poppler's pdftoppm first.
 */
export async function ocrDocument(data: Buffer, mime: string, maxPages = 10): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sl-ocr-"));
  try {
    if (mime === "application/pdf") {
      const input = path.join(dir, "input.pdf");
      await writeFile(input, data, { mode: 0o600 });
      await run("pdftoppm", ["-r", "220", "-gray", "-png", "-l", String(maxPages), input, path.join(dir, "page")], {
        timeout: 120_000,
      });
      const pages = (await readdir(dir)).filter((f) => f.startsWith("page") && f.endsWith(".png")).sort();
      const texts: string[] = [];
      for (const p of pages) texts.push(await tesseract(path.join(dir, p)));
      return texts.join("\n\n");
    }
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const input = path.join(dir, `input.${ext}`);
    await writeFile(input, data, { mode: 0o600 });
    return await tesseract(input);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Render the first PDF pages to PNG for vision models (trusted providers only). */
export async function pdfToPngs(data: Buffer, maxPages = 4): Promise<Buffer[]> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sl-pdf-"));
  try {
    const input = path.join(dir, "input.pdf");
    await writeFile(input, data, { mode: 0o600 });
    await run("pdftoppm", ["-r", "150", "-png", "-l", String(maxPages), input, path.join(dir, "page")], { timeout: 60_000 });
    const pages = (await readdir(dir)).filter((f) => f.startsWith("page") && f.endsWith(".png")).sort();
    return Promise.all(pages.map((p) => readFile(path.join(dir, p))));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
