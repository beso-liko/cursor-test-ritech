import { extractPdfText } from "./pdf";
import { extractDocxText } from "./docx";
import { extractPptxText } from "./pptx";
import { extractTxtText } from "./txt";
import { extractImageText } from "./image";
import type { FileType } from "@/lib/supabase/types";

export async function extractText(
  buffer: Buffer,
  fileType: FileType
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "pptx":
      return extractPptxText(buffer);
    case "txt":
      return extractTxtText(buffer);
    case "png":
    case "jpg":
    case "jpeg":
      return extractImageText(buffer, fileType);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
