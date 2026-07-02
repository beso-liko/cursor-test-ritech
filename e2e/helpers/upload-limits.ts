import type { Page } from "@playwright/test";

export async function isUploadCapReached(page: Page): Promise<boolean> {
  const timezone = "UTC";
  const res = await page.request.get(
    `/api/upload/usage?timezone=${encodeURIComponent(timezone)}`
  );
  if (!res.ok()) return false;

  const contentType = res.headers()["content-type"] ?? "";
  if (!contentType.includes("application/json")) return false;

  let data: {
    unlimited?: boolean;
    remaining?: number | null;
    limit?: number | null;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return false;
  }

  if (data.unlimited) return false;
  if (data.remaining == null) return false;
  return data.remaining <= 0;
}

export async function shouldSkipUploadTests(page: Page): Promise<boolean> {
  return isUploadCapReached(page);
}
