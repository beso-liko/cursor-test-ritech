import OpenAI from "openai";
import heicConvert from "heic-convert";

// Formats OpenAI vision supports natively
const NATIVE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// HEIC/HEIF use heic-convert (pure-JS, no libheif iref limit)
const HEIC_TYPES = new Set(["heic", "heif"]);

// Brands that heic-decode already accepts (isHeic() allow-list)
const HEIC_DECODE_SUPPORTED = new Set([
  "mif1", "msf1", "heic", "heix", "hevc", "hevx",
]);

type ActualFormat = "jpeg" | "png" | "isobmff" | "unknown";

/**
 * Detect the real codec from magic bytes, ignoring the file extension.
 * Some devices/tools save JPEG data with a .heif/.heic extension.
 */
function detectFormat(buf: Buffer): ActualFormat {
  if (buf.length < 8) return "unknown";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";
  // ISOBMFF (HEIF/MP4/…): bytes 4-7 == "ftyp" somewhere in the first 64 bytes
  for (let off = 0; off <= Math.min(64, buf.length - 8); off += 4) {
    if (buf.slice(off + 4, off + 8).toString("binary") === "ftyp") return "isobmff";
  }
  return "unknown";
}

/**
 * heic-decode checks bytes 8-12 of the ftyp box for the major brand and only
 * accepts 6 values. Some valid HEIF files use other HEVC-profile brands.
 * Normalise the major brand to "heic" so heic-decode's guard passes; the rest
 * of the file is untouched so libheif can still decode it.
 */
function normaliseHeifBrand(buffer: Buffer): Buffer {
  for (let off = 0; off <= Math.min(64, buffer.length - 12); off += 4) {
    if (buffer.slice(off + 4, off + 8).toString("binary") !== "ftyp") continue;
    const brand = buffer.slice(off + 8, off + 12).toString("binary").replace(/\0/g, " ").trim();
    if (HEIC_DECODE_SUPPORTED.has(brand)) return buffer; // already accepted
    const patched = Buffer.from(buffer);
    patched.write("heic", off + 8, 4, "binary");
    return patched;
  }
  return buffer;
}

export async function extractImageText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let imageBuffer = buffer;
  let mimeType = NATIVE_MIME[fileType] ?? "image/jpeg";

  if (HEIC_TYPES.has(fileType)) {
    const actual = detectFormat(buffer);

    if (actual === "jpeg") {
      // File has a .heic/.heif extension but the payload is a plain JPEG —
      // common on Windows/Android exports. Use it as-is.
      mimeType = "image/jpeg";
    } else if (actual === "png") {
      mimeType = "image/png";
    } else {
      // True HEIF/HEIC container — convert to JPEG for OpenAI vision.
      const heifBuffer = normaliseHeifBrand(buffer);
      const converted = await heicConvert({
        buffer: new Uint8Array(heifBuffer),
        format: "JPEG",
        quality: 0.92,
      });
      imageBuffer = Buffer.from(converted);
      mimeType = "image/jpeg";
    }
  }

  const base64 = imageBuffer.toString("base64");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: "text",
            text: `You are a study assistant. Analyze this image thoroughly and produce a detailed text description suitable for studying.

Please:
1. Transcribe ALL visible text exactly as it appears
2. Describe any diagrams, charts, graphs, or figures and what they represent
3. Describe any tables and their contents
4. Note any formulas, equations, or code snippets
5. Summarize the main educational concepts shown

Be as detailed as possible so a student could learn from your description alone.`,
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
