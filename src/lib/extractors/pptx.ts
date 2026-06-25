// eslint-disable-next-line @typescript-eslint/no-require-imports
const officeParser = require("officeparser");

export async function extractPptxText(buffer: Buffer): Promise<string> {
  // officeparser v7+ returns an AST object — call .toText() for the plain string.
  // fileType hint is required when passing a Buffer (no magic-bytes auto-detection).
  const ast = await officeParser.parseOffice(buffer, { fileType: "pptx" });
  return (typeof ast?.toText === "function" ? ast.toText() : String(ast ?? "")).trim();
}
