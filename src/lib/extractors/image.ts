import OpenAI from "openai";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function extractImageText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const mimeType = MIME_TYPES[fileType] ?? "image/png";
  const base64 = buffer.toString("base64");

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
