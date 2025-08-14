// pdfDigest.js
// Compute a PAdES (detached) SHA-256 digest for a PDF that already contains
// a signature placeholder (/ByteRange and /Contents). Node >= 14.

import { createHash } from "crypto";
import { readFileSync } from "fs";

/**
 * Finds the ByteRange array and the Contents hex blob in a PDF buffer.
 * Returns { byteRange: [n0,n1,n2,n3], contentsStart, contentsEnd }.
 */
function locateSignatureStructures(pdfBuffer: Buffer) {
  const pdf = pdfBuffer;

  // 1) Find /ByteRange [a b c d]
  //    - Allow arbitrary whitespace/newlines between tokens
  //    - Capture four integers (they're decimal in prepared PDFs)
  const brPattern = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;

  console.log(pdf.toString("ascii"));
  const brMatch = brPattern.exec(pdf.toString("ascii"));
  if (!brMatch) {
    throw new Error(
      "Could not find /ByteRange in PDF. Make sure the PDF is prepared (detached mode)."
    );
  }

  const byteRange = brMatch.slice(1, 5).map((n) => parseInt(n, 10));

  // 2) Find /Contents <...> following the ByteRange
  // PDF spec & common practice: /Contents is a hex string between < and >
  // We search from the end of the ByteRange match to avoid wrong matches.
  const searchFrom = brMatch.index + brMatch[0].length;
  const tail = pdf.slice(searchFrom);

  // Match /Contents <...> without greediness; allow whitespace
  const contentsPattern = /\/Contents\s*<([0-9A-Fa-f\s\r\n]+)>/m;
  const contentsMatch = contentsPattern.exec(tail.toString("ascii"));
  if (!contentsMatch) {
    throw new Error("Could not find /Contents in PDF.");
  }

  // Compute absolute start/end (byte offsets) of the contents **payload**,
  // i.e., the bytes between '<' and '>' in the original PDF.
  const relStartOfContentsHex =
    contentsMatch.index + contentsMatch[0].indexOf("<") + 1;
  const relEndOfContentsHex =
    contentsMatch.index + contentsMatch[0].lastIndexOf(">");

  const contentsStart = searchFrom + relStartOfContentsHex;
  const contentsEnd = searchFrom + relEndOfContentsHex;

  return { byteRange, contentsStart, contentsEnd };
}

/**
 * Compute the SHA-256 digest (hex & base64) of the PDF according to ByteRange,
 * i.e. hash everything except the /Contents hex blob (the placeholder).
 *
 * @param {Buffer|Uint8Array} pdfBuffer
 * @returns {{ hex:string, base64:string, byteRange:number[] }}
 */
export function computeDetachedPdfDigest(pdfBuffer: Buffer) {
  const pdf = pdfBuffer;

  const { byteRange, contentsStart, contentsEnd } =
    locateSignatureStructures(pdf);

  // Sanity checks per the PDF signing rules:
  // ByteRange = [start0, len0, start1, len1]
  // - The gap [start1, start1+len1) must correspond to the /Contents hex area INCLUDING the '<' and '>'
  //   According to common practice (and as clarified in community answers), the ByteRange excludes the < >
  //   but counts the bytes around them; in prepared PDFs, ByteRange aligns with the actual file layout. :contentReference[oaicite:1]{index=1}
  const [start0, len0, start1, len1] = byteRange;
  if (start0 !== 0) {
    throw new Error("Unexpected ByteRange start; expected 0.");
  }

  // Derive the slices to hash: [0 .. start1) and [start1+len1 .. end)
  // IMPORTANT: The digest must NOT include the '<...>' contents itself. :contentReference[oaicite:2]{index=2}
  const part1 = pdf.slice(0, start1);
  const part2 = pdf.slice(start1 + len1);

  // Extra guard: ensure the located /Contents hex region lies inside the ByteRange gap.
  if (!(contentsStart >= start1 && contentsEnd <= start1 + len1)) {
    // Not fatal for hashing (we trust ByteRange), but warn loudly for mismatches.
    // You can switch this to throw if you want to enforce strictness.
    // console.warn('Warning: /Contents not within ByteRange gap. Proceeding with ByteRange.');
  }

  const hash = createHash("sha256");
  hash.update(part1);
  hash.update(part2);
  const digestHex = hash.digest("hex");
  const digestBase64 = Buffer.from(digestHex, "hex").toString("base64");

  return { hex: digestHex, base64: digestBase64, byteRange };
}

/**
 * Convenience to check if a PDF looks "prepared" for detached signing.
 * (Has a ByteRange and a /Contents placeholder.)
 */
export function isDetachedPrepared(pdfBuffer: Buffer) {
  try {
    locateSignatureStructures(pdfBuffer);
    return true;
  } catch {
    return false;
  }
}

// Example CLI usage:
//   node pdfDigest.js input.pdf
const path = process.argv[2];
if (!path) {
  console.error("Usage: node pdfDigest.js <prepared-detached.pdf>");
  process.exit(1);
}
const pdf = readFileSync(path);
const { hex, base64, byteRange } = computeDetachedPdfDigest(pdf);
console.log("ByteRange:", byteRange);
console.log("SHA-256 (hex):", hex);
console.log("SHA-256 (base64):", base64);
