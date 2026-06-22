// eslint-disable-next-line @typescript-eslint/no-require-imports
const officeParser = require("officeparser");
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";

export async function extractPptxText(buffer: Buffer): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `pptx_${Date.now()}.pptx`);
  try {
    await fs.writeFile(tmpPath, buffer);
    return await new Promise<string>((resolve, reject) => {
      officeParser.parseOffice(
        tmpPath,
        (text: string, err: Error | null) => {
          if (err) reject(err);
          else resolve(text.trim());
        }
      );
    });
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
