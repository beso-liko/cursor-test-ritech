import type { Page } from "@playwright/test";

export const MOCK_QUIZ = {
  id: "e2e-quiz",
  document_id: "e2e-doc",
  group_id: null,
  created_at: new Date().toISOString(),
  questions: [
    {
      question: "What does photosynthesis produce?",
      options: ["Oxygen", "Nitrogen", "Helium", "Carbon monoxide"],
      correct: 0,
      explanation: "Photosynthesis releases oxygen as a byproduct.",
      difficulty: "easy" as const,
    },
    {
      question: "Where does photosynthesis occur in plant cells?",
      options: ["Mitochondria", "Chloroplasts", "Nucleus", "Ribosomes"],
      correct: 1,
      explanation: "Chloroplasts contain chlorophyll for photosynthesis.",
      difficulty: "medium" as const,
    },
  ],
};

const MOCK_SUMMARY_INITIAL = {
  summary: "Mock summary about photosynthesis in plants.",
  keyPoints: ["Light energy conversion", "Chlorophyll role"],
  topics: ["Photosynthesis"],
};

const MOCK_SUMMARY_REGENERATED = {
  summary: "Regenerated summary with updated study content.",
  keyPoints: ["Updated key point"],
  topics: ["Photosynthesis"],
};

/** Prevent real LLM calls when confirming whole-document generation. */
export async function mockGenerateApis(page: Page) {
  await page.route("**/api/generate/summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-summary",
        document_id: "e2e-doc",
        content: JSON.stringify(MOCK_SUMMARY_INITIAL),
        created_at: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/generate/flashcards", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "e2e-card-1",
          document_id: "e2e-doc",
          question: "What is photosynthesis?",
          answer: "Converting light to chemical energy",
          difficulty: "easy",
        },
        {
          id: "e2e-card-2",
          document_id: "e2e-doc",
          question: "What pigment absorbs light?",
          answer: "Chlorophyll",
          difficulty: "easy",
        },
      ]),
    });
  });

  await page.route("**/api/generate/quiz", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_QUIZ),
    });
  });
}

/** Summary returns different content on the second generate call. */
export async function mockGenerateApisWithSummaryRegenerate(page: Page) {
  let summaryCalls = 0;

  await page.route("**/api/generate/summary", async (route) => {
    summaryCalls += 1;
    const payload =
      summaryCalls === 1 ? MOCK_SUMMARY_INITIAL : MOCK_SUMMARY_REGENERATED;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: `e2e-summary-${summaryCalls}`,
        document_id: "e2e-doc",
        content: JSON.stringify(payload),
        created_at: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/generate/flashcards", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "e2e-card-1",
          document_id: "e2e-doc",
          question: "What is photosynthesis?",
          answer: "Converting light to chemical energy",
          difficulty: "easy",
        },
      ]),
    });
  });

  await page.route("**/api/generate/quiz", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_QUIZ),
    });
  });
}

export async function mockQuizVariantApi(page: Page) {
  await page.route("**/api/quiz-variant**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_QUIZ),
    });
  });
}

export async function mockQuizResultApi(page: Page) {
  await page.route("**/api/quiz-result", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

export async function mockValidateFocusOffTopic(page: Page) {
  await page.route("**/api/generate/validate-focus", async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "off_topic" }),
    });
  });
}

export async function mockValidateFocusValid(page: Page) {
  await page.route("**/api/generate/validate-focus", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ valid: true }),
    });
  });
}

export async function mockChatApi(
  page: Page,
  reply = "Photosynthesis converts light energy into chemical energy in plants."
) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
      body: `0:${JSON.stringify(reply)}\n`,
    });
  });
}

export async function mockUploadUsageAtCap(page: Page) {
  await page.route("**/api/upload/usage**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        used: 5,
        limit: 5,
        remaining: 0,
        unlimited: false,
        resetsOn: "Aug 1, 2026",
      }),
    });
  });
}

export async function mockUploadUsageNormal(page: Page) {
  await page.route("**/api/upload/usage**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        used: 1,
        limit: 10,
        remaining: 9,
        unlimited: false,
        resetsOn: "Aug 1, 2026",
      }),
    });
  });
}

export async function mockChatOffTopic(page: Page) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "off_topic" }),
    });
  });
}
