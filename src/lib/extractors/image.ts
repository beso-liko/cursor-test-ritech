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

export async function extractImageText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let imageBuffer = buffer;
  let mimeType = NATIVE_MIME[fileType] ?? "image/jpeg";

  if (HEIC_TYPES.has(fileType)) {
    const converted = await heicConvert({
      buffer: new Uint8Array(buffer),
      format: "JPEG",
      quality: 0.92,
    });
    imageBuffer = Buffer.from(converted);
    mimeType = "image/jpeg";
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
