// Import the internal implementation directly to avoid pdf-parse/index.js, which
// has a top-level `if (!module.parent)` block that calls Fs.readFileSync on a
// test fixture that doesn't exist in Vercel's serverless environment, causing the
// entire require() to throw and every PDF upload to 422.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse");

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return (data.text as string).trim();
}
